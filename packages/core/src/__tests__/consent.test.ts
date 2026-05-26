import { test, expect, describe, vi } from 'vitest'
import { LoggerStrategy } from '../index.js'
import type { AnalyticsProvider, Transport } from '../types.js'
import { LogLevel } from '../types.js'

function makeProvider(): AnalyticsProvider & {
  event: ReturnType<typeof vi.fn>
  screen: ReturnType<typeof vi.fn>
  identify: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
} {
  return {
    name: 'test-provider',
    enabled: true,
    event: vi.fn(),
    init: vi.fn(),
    screen: vi.fn(),
    identify: vi.fn(),
    error: vi.fn(),
  }
}

function makeTransport(): Transport & { log: ReturnType<typeof vi.fn> } {
  return {
    name: 'test-transport',
    minLevel: LogLevel.DEBUG,
    log: vi.fn(),
    flush: vi.fn(),
  }
}

describe('consent — default (no config)', () => {
  test('without consent config, all analytics methods pass to providers', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    })

    logger.event('app-open' as any, {})
    expect(provider.event).toHaveBeenCalledWith('app-open', {})

    logger.logScreen('HomeScreen')
    expect(provider.screen).toHaveBeenCalledWith('HomeScreen', undefined)

    logger.setUser({ id: 'u1' })
    expect(provider.identify).toHaveBeenCalledWith({ id: 'u1' })
  })

  test('without consent config, getConsent returns analytics=true, errors=true', () => {
    const logger = new LoggerStrategy({ emitAppOpenOnInit: false })
    const consent = logger.getConsent()
    expect(consent.analytics).toBe(true)
    expect(consent.errors).toBe(true)
  })
})

describe('consent — analytics=false', () => {
  test('event() is no-op when analytics=false', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()
  })

  test('logScreen() is no-op when analytics=false', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.logScreen('HomeScreen')
    expect(provider.screen).not.toHaveBeenCalled()
  })

  test('setUser() is no-op when analytics=false', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.setUser({ id: 'u1' })
    expect(provider.identify).not.toHaveBeenCalled()
  })

  test('log-level info() still emits to transport when analytics=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.info('direct message')
    expect(transport.log).toHaveBeenCalledTimes(1)
    expect(transport.log.mock.calls[0][0].message).toBe('direct message')
  })

  test('log-level warn() still emits to transport when analytics=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.warn('warn message')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('log-level debug() still emits to transport when analytics=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.debug('debug message')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('log-level fatal() still emits to transport when analytics=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.fatal('fatal message')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('log-level error() (1-2 args) still emits to transport when analytics=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.error('something failed')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })
})

describe('consent — errors=false', () => {
  test('captureError() does NOT call providers when errors=false', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { errors: false },
    })

    logger.captureError('feat', 'something', true, new Error('oops'))
    expect(provider.error).not.toHaveBeenCalled()
  })

  test('captureError() DOES emit to transport when errors=false', () => {
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { errors: false },
    })

    logger.captureError('feat', 'something', true, new Error('oops'))
    expect(transport.log).toHaveBeenCalledTimes(1)
    expect(transport.log.mock.calls[0][0].level).toBe(LogLevel.ERROR)
  })
})

describe('consent — setConsent', () => {
  test('setConsent merges partially: changing analytics does not reset errors', () => {
    const logger = new LoggerStrategy({
      emitAppOpenOnInit: false,
      consent: { analytics: false, errors: true },
    })

    logger.setConsent({ analytics: true })

    const consent = logger.getConsent()
    expect(consent.analytics).toBe(true)
    expect(consent.errors).toBe(true)
  })

  test('setConsent after init enables previously blocked events', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { analytics: false },
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()

    logger.setConsent({ analytics: true })
    logger.event('app-open' as any, {})
    expect(provider.event).toHaveBeenCalledTimes(1)
  })

  test('getConsent returns a copy — mutating it does not affect internal state', () => {
    const logger = new LoggerStrategy({
      emitAppOpenOnInit: false,
      consent: { analytics: true, errors: true },
    })

    const consent = logger.getConsent()
    consent.analytics = false

    // Internal state should be unchanged
    expect(logger.getConsent().analytics).toBe(true)
  })
})

describe('consent — combinations', () => {
  test('analytics=false + errors=true: events blocked, captureError calls providers', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      consent: { analytics: false, errors: true },
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()

    logger.captureError('feat', 'something', true, new Error('oops'))
    expect(provider.error).toHaveBeenCalledTimes(1)
  })

  test('analytics=false + errors=false: both events and captureError blocked for providers, transport still gets error', () => {
    const provider = makeProvider()
    const transport = makeTransport()
    const logger = new LoggerStrategy({
      providers: [provider],
      transports: [transport],
      emitAppOpenOnInit: false,
      consent: { analytics: false, errors: false },
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()

    logger.captureError('feat', 'something', true, new Error('oops'))
    expect(provider.error).not.toHaveBeenCalled()
    // Transport still receives the error entry
    expect(transport.log).toHaveBeenCalledTimes(1)
  })
})

describe('consent — pre-init buffer interaction', () => {
  test('analytics=false + preInitBuffer: events NOT buffered (gate before bufferOrRun)', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
      consent: { analytics: false },
    })

    // With analytics=false, events should be dropped before even reaching buffer
    logger.event('app-open' as any, {})

    // Now init() — if event was buffered it would dispatch here
    logger.init()

    expect(provider.event).not.toHaveBeenCalled()
  })

  test('analytics=true + preInitBuffer: events ARE buffered and dispatched on init', () => {
    const provider = makeProvider()
    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
      consent: { analytics: true },
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()

    logger.init()
    expect(provider.event).toHaveBeenCalledWith('app-open', {})
  })
})
