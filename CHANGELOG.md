# Changelog

## [3.0.0] - 2026-05-26

### Breaking Changes

- `error(feature, name, critical, err, extra)` overload **removed**. Use `captureError(feature, name, critical, err, extra)` instead. Log-level `error(msg, ctx?)` is unchanged.
- `info(feature, name, properties)` overload **removed**. Use `logFeature(feature, name, properties)` instead. Log-level `info(msg, ctx?)` is unchanged.
- `EVENT_TAGS` type is now `Record<string, Record<string, unknown>>` (was hardcoded event keys). Use `EventRegistry` module augmentation for typed events.
- `LoggerStrategyConstructor[]` config now emits a `console.warn` deprecation notice. Migrate to `LoggerConfig` with `AnalyticsProvider` instances.

### Migration

```diff
- logger.error('Auth', 'login_failed', true, err)
+ logger.captureError('Auth', 'login_failed', true, err)

- logger.info('Auth', 'login_success', { method: 'oauth' })
+ logger.logFeature('Auth', 'login_success', { method: 'oauth' })

- declare global { interface EVENT_TAGS { ... } }
+ declare module '@emit/core' { interface EventRegistry { ... } }
```

React package — `AnalyticsContextValue` now exposes `captureError`; `error` is kept as a deprecated alias:

```diff
- analytics.error('ReactErrorBoundary', error.name, true, error, extra)
+ analytics.captureError('ReactErrorBoundary', error.name, true, error, extra)
```

### Added (v2.x feature parity, recap)

- Child loggers, AsyncLocalStorage context propagation
- Built-in plugins: redact, sample, rateLimit, normalizeStack
- Transports: JSONTransport, HTTPTransport, DevToolsTransport
- `circuitBreaker` provider wrapper
- Consent gate (GDPR) — `setConsent` / `getConsent`
- Pre-init event buffer
- Test helpers (`@emit/core/test`)
- React 19 support (`useFormAnalytics`, `withAnalytics` server action)
- Codegen drift detection + JSON Schema / Avro export
- New packages: `@emit/next`, `@emit/fastify`, `@emit/hono`, `@emit/otel`

### Package versions bumped to 3.0.0

- `@emit/core`
- `@emit/react`
- `@emit/next`
- `@emit/fastify`
- `@emit/hono`
- `@emit/otel`
- `@emit/codegen`
