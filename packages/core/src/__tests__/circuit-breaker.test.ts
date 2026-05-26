import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import { circuitBreaker } from '../circuit-breaker.js'
import type { AnalyticsProvider } from '../types.js'

function makeProvider(overrides?: Partial<AnalyticsProvider>): AnalyticsProvider {
  return {
    name: 'test-provider',
    enabled: true,
    init: vi.fn(),
    event: vi.fn(),
    identify: vi.fn(),
    screen: vi.fn(),
    error: vi.fn(),
    flush: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('circuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('preserves name and enabled from original provider', () => {
    const provider = makeProvider({ name: 'my-provider', enabled: false })
    const wrapped = circuitBreaker(provider)
    expect(wrapped.name).toBe('my-provider')
    expect(wrapped.enabled).toBe(false)
  })

  test('5 consecutive errors open the circuit and call onStateChange', () => {
    const provider = makeProvider({
      event: vi.fn().mockImplementation(() => { throw new Error('fail') }),
    })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 5, onStateChange })

    for (let i = 0; i < 4; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }
    expect(onStateChange).not.toHaveBeenCalled()

    expect(() => wrapped.event?.('app-open')).toThrow('fail')
    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'test-provider')
  })

  test('OPEN state blocks subsequent calls', () => {
    const provider = makeProvider({
      event: vi.fn().mockImplementation(() => { throw new Error('fail') }),
    })
    const wrapped = circuitBreaker(provider, { failureThreshold: 3 })

    for (let i = 0; i < 3; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }

    // now OPEN — calls should be blocked (no throw, returns undefined)
    const result = wrapped.event?.('app-open')
    expect(result).toBeUndefined()
    // provider.event should still have been called only 3 times
    expect(provider.event).toHaveBeenCalledTimes(3)
  })

  test('after cooldownMs transitions to HALF_OPEN', () => {
    const eventFn = vi.fn()
      .mockImplementation(() => { throw new Error('fail') })
    const provider = makeProvider({ event: eventFn })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 3, cooldownMs: 5000, onStateChange })

    for (let i = 0; i < 3; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }
    expect(onStateChange).toHaveBeenLastCalledWith('OPEN', 'test-provider')
    onStateChange.mockClear()

    vi.advanceTimersByTime(5000)

    // Switch to success so the HALF_OPEN probe call passes
    eventFn.mockImplementation(() => undefined)

    // This call should trigger the HALF_OPEN -> CLOSED transition
    wrapped.event?.('app-open')
    expect(onStateChange).toHaveBeenCalledWith('HALF_OPEN', 'test-provider')
    expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'test-provider')
  })

  test('HALF_OPEN: success transitions back to CLOSED', () => {
    const eventFn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail') }) // 1
      .mockImplementationOnce(() => { throw new Error('fail') }) // 2
      .mockImplementationOnce(() => { throw new Error('fail') }) // 3 -> OPEN
      .mockImplementation(() => undefined) // subsequent calls succeed

    const provider = makeProvider({ event: eventFn })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 3, cooldownMs: 5000, onStateChange })

    for (let i = 0; i < 3; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }
    onStateChange.mockClear()

    vi.advanceTimersByTime(5000)

    // This call goes through in HALF_OPEN (provider is called), succeeds -> CLOSED
    wrapped.event?.('app-open')
    expect(onStateChange).toHaveBeenCalledWith('HALF_OPEN', 'test-provider')
    expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'test-provider')
  })

  test('HALF_OPEN: failure transitions back to OPEN and resets cooldown', () => {
    const eventFn = vi.fn().mockImplementation(() => { throw new Error('fail') })
    const provider = makeProvider({ event: eventFn })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 3, cooldownMs: 5000, onStateChange })

    for (let i = 0; i < 3; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }
    onStateChange.mockClear()

    vi.advanceTimersByTime(5000)

    // First call in HALF_OPEN fails -> back to OPEN
    expect(() => wrapped.event?.('app-open')).toThrow('fail')
    expect(onStateChange).toHaveBeenCalledWith('HALF_OPEN', 'test-provider')
    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'test-provider')

    // Verify still blocked (still OPEN, cooldown reset)
    eventFn.mockImplementation(() => undefined)
    const result = wrapped.event?.('app-open')
    expect(result).toBeUndefined()
  })

  test('4 errors + 1 success resets counter (5th error does NOT open circuit)', () => {
    let callCount = 0
    const eventFn = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount !== 4) throw new Error('fail') // calls 1,2,3 fail; call 4 succeeds; call 5 fails
      // call 4 succeeds — return normally
    })

    const provider = makeProvider({ event: eventFn })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 5, onStateChange })

    // calls 1, 2, 3 fail
    for (let i = 0; i < 3; i++) {
      expect(() => wrapped.event?.('app-open')).toThrow('fail')
    }

    // call 4 succeeds — resets counter
    wrapped.event?.('app-open')
    expect(onStateChange).not.toHaveBeenCalled()

    // call 5 fails — but counter was reset, so it's only failure #1 now, no OPEN
    expect(() => wrapped.event?.('app-open')).toThrow('fail')
    expect(onStateChange).not.toHaveBeenCalled()
  })

  test('onStateChange receives correct state and provider name', () => {
    const provider = makeProvider({
      name: 'analytics-provider',
      event: vi.fn().mockImplementation(() => { throw new Error('fail') }),
    })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 2, cooldownMs: 1000, onStateChange })

    expect(() => wrapped.event?.('app-open')).toThrow()
    expect(() => wrapped.event?.('app-open')).toThrow()

    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'analytics-provider')
  })

  test('custom threshold is respected', () => {
    const provider = makeProvider({
      event: vi.fn().mockImplementation(() => { throw new Error('fail') }),
    })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 2, onStateChange })

    expect(() => wrapped.event?.('app-open')).toThrow('fail')
    expect(onStateChange).not.toHaveBeenCalled()

    expect(() => wrapped.event?.('app-open')).toThrow('fail')
    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'test-provider')
  })

  test('all provider methods are wrapped (init, identify, screen, error, flush, reset)', () => {
    const provider = makeProvider({
      init: vi.fn().mockImplementation(() => { throw new Error('fail') }),
      identify: vi.fn().mockImplementation(() => { throw new Error('fail') }),
      screen: vi.fn().mockImplementation(() => { throw new Error('fail') }),
      error: vi.fn().mockImplementation(() => { throw new Error('fail') }),
      flush: vi.fn().mockImplementation(() => { throw new Error('fail') }),
      reset: vi.fn().mockImplementation(() => { throw new Error('fail') }),
    })
    const onStateChange = vi.fn()
    const wrapped = circuitBreaker(provider, { failureThreshold: 6, onStateChange })

    expect(() => wrapped.init?.()).toThrow()
    expect(() => wrapped.identify?.({ id: '1' })).toThrow()
    expect(() => wrapped.screen?.('home')).toThrow()
    expect(() => wrapped.error?.('feat', 'name', false, new Error('x'))).toThrow()
    expect(() => wrapped.flush?.()).toThrow()
    expect(() => wrapped.reset?.()).toThrow()

    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'test-provider')
  })
})
