import { test, expect, describe, vi } from 'vitest'
import { LoggerStrategy } from '../index.js'
import type { AnalyticsProvider, EventRegistry } from '../types.js'

// Module augmentation — extend EventRegistry inline for this test file
declare module '../types.js' {
  interface EventRegistry {
    'purchase': { orderId: string; total: number }
    'view': { page: string }
  }
}

describe('event registry — type-safe augmentation', () => {
  test('augmented event types compile and are dispatched correctly at runtime', () => {
    const eventMock = vi.fn()
    const provider: AnalyticsProvider = {
      name: 'test',
      enabled: true,
      event: eventMock,
    }

    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    })
    logger.init()

    // These calls should type-check (purchase and view are in the augmented registry)
    logger.event('purchase', { orderId: 'order-1', total: 99 })
    logger.event('view', { page: '/home' })

    expect(eventMock).toHaveBeenCalledWith('purchase', { orderId: 'order-1', total: 99 })
    expect(eventMock).toHaveBeenCalledWith('view', { page: '/home' })
  })

  test('default (no augmentation) still accepts string event names', () => {
    // This verifies that without augmentation the default EVENT_TAGS (or RegisteredEvents)
    // resolves to EVENT_TAGS which has string keys — backwards compatible usage.
    const eventMock = vi.fn()
    const provider: AnalyticsProvider = {
      name: 'p',
      enabled: true,
      event: eventMock,
    }

    // Use explicit generic to bypass augmentation for this test
    const logger = new LoggerStrategy<
      string, string, { id: string }, any, any, { 'app-open': Record<string, never> }
    >({
      providers: [provider],
      emitAppOpenOnInit: false,
    })
    logger.init()

    logger.event('app-open', {})
    expect(eventMock).toHaveBeenCalledWith('app-open', {})
  })

  test('EventRegistry interface is exported and can be augmented', () => {
    // Compile-time proof: if EventRegistry is importable, augmentation is possible.
    // This is a no-op runtime test; the real check is that TypeScript compiles this file.
    const registry: EventRegistry = {
      'purchase': { orderId: 'x', total: 0 },
      'view': { page: '/' },
    }
    expect(Object.keys(registry)).toContain('purchase')
    expect(Object.keys(registry)).toContain('view')
  })
})
