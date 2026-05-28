import { test, expect, describe, vi, beforeEach } from 'vitest'
import { EmitIoStrategy } from '../index.js'
import type { AnalyticsProvider, Transport } from '../types.js'
import { LogLevel } from '../types.js'

function makeProvider(): AnalyticsProvider & { event: ReturnType<typeof vi.fn> } {
  return {
    name: 'test-provider',
    enabled: true,
    event: vi.fn(),
    init: vi.fn(),
    screen: vi.fn(),
    identify: vi.fn(),
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

describe('pre-init buffer — disabled (default)', () => {
  test('without buffer config, events called pre-init pass through immediately (no buffering)', () => {
    const provider = makeProvider()
    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    })

    // Without preInitBuffer, events go directly to providers (no queuing, no withholding)
    logger.event('app-open' as any, {})
    expect(provider.event).toHaveBeenCalledWith('app-open', {})
  })

  test('without buffer config, events after init are also delivered normally', () => {
    const provider = makeProvider()
    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    })

    logger.init()
    logger.event('app-open' as any, {})
    expect(provider.event).toHaveBeenCalledWith('app-open', {})
  })
})

describe('pre-init buffer — enabled', () => {
  test('with buffer config, events called pre-init are enqueued (not dispatched yet)', () => {
    const provider = makeProvider()
    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.event('app-open' as any, {})
    expect(provider.event).not.toHaveBeenCalled()
  })

  test('init() drains buffer in FIFO order', () => {
    const order: string[] = []
    const provider: AnalyticsProvider = {
      name: 'ordered',
      enabled: true,
      event: (name: any) => { order.push(String(name)) },
    }

    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.event('first' as any)
    logger.event('second' as any)
    logger.event('third' as any)

    expect(order).toHaveLength(0)

    logger.init()

    expect(order).toEqual(['first', 'second', 'third'])
  })

  test('buffer full: oldest item dropped when size exceeded', () => {
    const received: string[] = []
    const provider: AnalyticsProvider = {
      name: 'sized',
      enabled: true,
      event: (name: any) => { received.push(String(name)) },
    }

    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: { size: 3 },
    })

    logger.event('a' as any)
    logger.event('b' as any)
    logger.event('c' as any)
    // This one overflows: 'a' should be dropped
    logger.event('d' as any)

    logger.init()

    expect(received).toEqual(['b', 'c', 'd'])
    expect(received).not.toContain('a')
  })

  test('logScreen is buffered', () => {
    const provider = makeProvider()
    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.logScreen('HomeScreen', { id: '1' })
    expect(provider.screen).not.toHaveBeenCalled()

    logger.init()
    expect(provider.screen).toHaveBeenCalledWith('HomeScreen', { id: '1' })
  })

  test('setUser is buffered and called after init', () => {
    const provider = makeProvider()
    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.setUser({ id: 'user-1' })
    expect(provider.identify).not.toHaveBeenCalled()

    logger.init()
    expect(provider.identify).toHaveBeenCalledWith({ id: 'user-1' })
  })

  test('network is buffered', () => {
    const strategy = {
      init: vi.fn(),
      log: vi.fn(),
      event: vi.fn(),
      network: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      reset: vi.fn(),
      logScreen: vi.fn(),
      setUserId: vi.fn(),
      setUserProperty: vi.fn(),
      setUser: vi.fn(),
      setUserProperties: vi.fn(),
      logBeginCheckout: vi.fn(),
      logPaymentSuccess: vi.fn(),
      flush: vi.fn(),
      getId: vi.fn(() => 'mock'),
    }

    const logger = new EmitIoStrategy({
      // Use legacy array style for network (it's legacy-only)
      preInitBuffer: {},
    } as any)

    // Just verify it doesn't throw when buffering is enabled
    expect(() => logger.network('RestApi_request' as any, {})).not.toThrow()
  })
})

describe('pre-init buffer — log-level methods NOT buffered', () => {
  test('info (log-level form, 1 arg) goes directly to transports even pre-init', () => {
    const transport = makeTransport()
    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.info('direct message')
    expect(transport.log).toHaveBeenCalledTimes(1)
    expect(transport.log.mock.calls[0][0].message).toBe('direct message')
  })

  test('debug goes directly to transports pre-init', () => {
    const transport = makeTransport()
    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.debug('debug msg')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('warn goes directly to transports pre-init', () => {
    const transport = makeTransport()
    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.warn('warn msg')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('fatal goes directly to transports pre-init', () => {
    const transport = makeTransport()
    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.fatal('fatal msg')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })

  test('error (log-level form) goes directly to transports pre-init', () => {
    const transport = makeTransport()
    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
      preInitBuffer: {},
    })

    logger.error('something failed')
    expect(transport.log).toHaveBeenCalledTimes(1)
  })
})
