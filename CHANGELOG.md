# Changelog

## [1.0.0] - 2026-05-26

First release under the `@emit` scope.

### Packages

| Package | Description |
|---|---|
| `@emitio/core` | LoggerStrategy, transports (Console, JSON, HTTP, DevTools), plugins (redact, sample, rateLimit, normalizeStack), context, circuit breaker, consent gate |
| `@emitio/react` | React hooks, AnalyticsProvider, server action wrapper (`withAnalytics`) |
| `@emitio/react-native` | React Native hooks, AnalyticsProvider, AppState tracking, navigation integration |
| `@emitio/next` | Next.js middleware + route handler instrumentation |
| `@emitio/fastify` | Fastify plugin — per-request child logger, request ID, hook timings |
| `@emitio/hono` | Hono middleware — request ID, child logger, ALS context propagation |
| `@emitio/otel` | OpenTelemetry bridge — logs → LogRecords, events → spans |
| `@emitio/codegen` | CLI codegen — YAML schema → TypeScript, drift detection, JSON Schema/Avro export |

### Features

- Zero runtime dependencies on `@emitio/core`
- Multi-runtime: Node, browser, edge (Workerd), React Native
- Dual-purpose: analytics events + structured logging through the same API
- Type-safe event registry via module augmentation
- Child loggers with context binding
- AsyncLocalStorage context propagation (`runWithContext`)
- GDPR consent gate (`setConsent`/`getConsent`)
- Circuit breaker for analytics providers
- Pre-init event buffer
- Plugin pipeline (transform/drop log entries)
- Per-transport log level filtering
