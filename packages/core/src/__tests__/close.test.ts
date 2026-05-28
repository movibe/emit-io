import { test, expect, describe, vi } from 'vitest'
import { EmitIoStrategy } from '../index.js'
import type { Transport, AnalyticsProvider } from '../types.js'
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
      flush: () => new Promise<void>(resolve => {
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
      flush: () => new Promise<void>(r => setTimeout(() => { results.push('slow'); r() }, 20)),
    }

    const fast: Transport = {
      name: 'fast',
      minLevel: LogLevel.DEBUG,
      log: vi.fn(),
      flush: () => new Promise<void>(r => setTimeout(() => { results.push('fast'); r() }, 5)),
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
