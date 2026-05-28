import { EmitIoStrategy, ConsoleTransport, type AnalyticsProvider, LogLevelEnum } from 'emit-io-core'

// The consent gate blocks analytics calls when analytics: false.
// Structural log output (transports) is never blocked.
// errors: true means captureError() still reaches providers even when analytics is off.

const analyticsProvider: AnalyticsProvider = {
  name: 'analytics',
  enabled: true,
  event(name, properties) {
    console.log('[analytics] event:', name, properties)
  },
  error(feature, name, critical, err) {
    console.log('[analytics] error:', feature, name, critical)
  },
}

const emit = new EmitIoStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG })],
  providers: [analyticsProvider],
  consent: { analytics: false, errors: true },
})

emit.event('user-login', { method: 'oauth' })         // BLOCKED by consent
emit.captureError('Auth', 'fail', false, new Error()) // ALLOWED (errors: true)

// User accepts cookies in the UI
emit.setConsent({ analytics: true })

emit.event('user-login', { method: 'oauth' })         // NOW allowed
console.log(emit.getConsent())                        // { analytics: true, errors: true }
