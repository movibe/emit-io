import { EmitIoStrategy, type AnalyticsProvider } from 'emit-io-core'

// EventRegistry module augmentation gives emit.event() full TypeScript types.
// Each key is an event name; its value type is the shape of the properties object.
// Place this augmentation in a .d.ts file or any file included by tsconfig.

declare module 'emit-io-core' {
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

const emit = new EmitIoStrategy({ providers: [provider] })

// Fully typed — autocomplete on event name and property keys
emit.event('purchase', { orderId: 'ord-1', total: 99.99, currency: 'USD' })
emit.event('pageview', { path: '/home' })
emit.event('signup', { method: 'oauth', plan: 'pro' })

// TypeScript errors (uncomment to see):
// emit.event('purchase', { orderId: 'x' })          // missing total + currency
// emit.event('unknown-event', {})                   // not in registry
// emit.event('purchase', { currency: 'GBP', ... })  // GBP not assignable
