import { LoggerStrategy, type AnalyticsProvider } from '@movibe/logger'

// EventRegistry module augmentation gives logger.event() full TypeScript types.
// Each key is an event name; its value type is the shape of the properties object.
// Place this augmentation in a .d.ts file or any file included by tsconfig.

declare module '@movibe/logger' {
  interface EventRegistry {
    'purchase': { orderId: string; total: number; currency: 'USD' | 'EUR' }
    'pageview': { path: string; referrer?: string }
    'signup': { method: 'email' | 'oauth'; plan: string }
    'feature-used': { feature: string; durationMs?: number }
  }
}

const provider: AnalyticsProvider = {
  name: 'console',
  enabled: true,
  event(name, properties) {
    console.log('[event]', name, properties)
  },
}

const logger = new LoggerStrategy({ providers: [provider] })

// Fully typed — autocomplete on event name and property keys
logger.event('purchase', { orderId: 'ord-1', total: 99.99, currency: 'USD' })
logger.event('pageview', { path: '/home' })
logger.event('signup', { method: 'oauth', plan: 'pro' })

// TypeScript errors (uncomment to see):
// logger.event('purchase', { orderId: 'x' })          // missing total + currency
// logger.event('unknown-event', {})                   // not in registry
// logger.event('purchase', { currency: 'GBP', ... })  // GBP not assignable
