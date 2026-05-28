import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EmitIoStrategy, HTTPTransport } from '../index.js'
import type { AnalyticsProvider, Transport } from '../types.js'
import { LogLevel } from '../types.js'

describe('close()', () => {
  test('close() calls flush on transports', async () => {
    const flushMock = vi.fn()
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: flushMock,
    }

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    await logger.close()
    expect(flushMock).toHaveBeenCalled()
  })

  test('close() awaits Promise<void> returned by async transport.flush', async () => {
    const order: string[] = []

    const transport: Transport = {
      name: 'async-transport',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            order.push('flushed')
            resolve()
          }, 10)
        }),
    }

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    await logger.close()
    order.push('after-close')

    expect(order).toEqual(['flushed', 'after-close'])
  })

  test('close() resolves even if transport has no flush method', async () => {
    const transport: Transport = {
      name: 'no-flush',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
    }

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    await expect(logger.close()).resolves.toBeUndefined()
  })

  test('close() calls flush on providers (legacy + analytics)', async () => {
    const providerFlush = vi.fn()
    const provider: AnalyticsProvider = {
      name: 'provider',
      enabled: true,
      flush: providerFlush,
    }

    const logger = new EmitIoStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    })

    await logger.close()
    expect(providerFlush).toHaveBeenCalled()
  })

  test('close() resolves with no transports or providers', async () => {
    const logger = new EmitIoStrategy({ emitAppOpenOnInit: false })
    await expect(logger.close()).resolves.toBeUndefined()
  })

  test('close() flushes multiple transports in parallel and awaits all', async () => {
    const results: string[] = []

    const slow: Transport = {
      name: 'slow',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: () =>
        new Promise<void>((r) =>
          setTimeout(() => {
            results.push('slow')
            r()
          }, 20),
        ),
    }

    const fast: Transport = {
      name: 'fast',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: () =>
        new Promise<void>((r) =>
          setTimeout(() => {
            results.push('fast')
            r()
          }, 5),
        ),
    }

    const logger = new EmitIoStrategy({
      transports: [slow, fast],
      emitAppOpenOnInit: false,
    })

    await logger.close()

    // Both should be flushed by the time close() resolves
    expect(results).toContain('slow')
    expect(results).toContain('fast')
  })
})

describe('close() transport teardown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('strategy.close() closes an HTTPTransport (logs after close are ignored, no active timer)', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('ok', { status: 200 })))
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    await logger.close()

    // After close(), logging into the transport should be a no-op
    transport.log({ level: LogLevel.INFO, message: 'after close', timestamp: new Date() })
    await vi.advanceTimersByTimeAsync(120_000)

    // fetch should never have been called (buffer was empty, after close logs are ignored)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('strategy.close() calls close() on a mock transport', async () => {
    const closeMock = vi.fn()
    const flushMock = vi.fn()
    const transport: Transport = {
      name: 'mock-closeable',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: flushMock,
      close: closeMock,
    }

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    await logger.close()

    expect(flushMock).toHaveBeenCalled()
    expect(closeMock).toHaveBeenCalled()
  })

  test('strategy.close() calls close() on multiple transports', async () => {
    const close1 = vi.fn()
    const close2 = vi.fn()

    const t1: Transport = {
      name: 'transport-1',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      close: close1,
    }
    const t2: Transport = {
      name: 'transport-2',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      close: close2,
    }

    const logger = new EmitIoStrategy({
      transports: [t1, t2],
      emitAppOpenOnInit: false,
    })

    await logger.close()

    expect(close1).toHaveBeenCalledOnce()
    expect(close2).toHaveBeenCalledOnce()
  })

  test('strategy.close() resolves when transport.close() returns a Promise', async () => {
    const order: string[] = []
    const transport: Transport = {
      name: 'async-closeable',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      close: () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            order.push('transport-closed')
            resolve()
          }, 10)
        }),
    }

    const logger = new EmitIoStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    // Start closing, advance timers so the async close completes, then await
    const closePromise = logger.close()
    await vi.advanceTimersByTimeAsync(20)
    await closePromise

    order.push('strategy-close-resolved')

    expect(order).toEqual(['transport-closed', 'strategy-close-resolved'])
  })
})
