import { LoggerStrategy, circuitBreaker, type AnalyticsProvider } from '@emit/logger'

// circuitBreaker wraps any AnalyticsProvider. After failureThreshold consecutive
// errors, the circuit opens and calls are dropped for cooldownMs milliseconds.
// This prevents one flaky backend from impacting your application.

const flakyProvider: AnalyticsProvider = {
  name: 'flaky-api',
  enabled: true,
  event(name) {
    if (Math.random() < 0.4) {
      throw new Error('upstream timeout')
    }
    console.log('[analytics] sent:', name)
  },
}

const wrapped = circuitBreaker(flakyProvider, {
  failureThreshold: 5,
  cooldownMs: 30_000,
  onStateChange: (state) => {
    console.warn(`[circuit:flaky-api] state changed to: ${state}`)
  },
})

const logger = new LoggerStrategy({ providers: [wrapped] })

// Simulate traffic — circuit opens automatically after 5 consecutive failures
for (let i = 0; i < 20; i++) {
  logger.event('test-event', { i })
}
