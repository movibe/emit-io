# @emitio/core

[![npm version](https://img.shields.io/npm/v/@emitio/core)](https://www.npmjs.com/package/@emitio/core)
[![Tests & Coverage](https://github.com/Emit-logger/emit/actions/workflows/tests.yml/badge.svg)](https://github.com/Emit-logger/emit/actions/workflows/tests.yml)
[![codecov](https://codecov.io/gh/Emit-logger/emit/branch/main/graph/badge.svg)](https://codecov.io/gh/Emit-logger/emit)

Universal logging + analytics for TypeScript — Node, browser, edge, React Native.

```typescript
import { LoggerStrategy, JSONTransport, ConsoleTransport, redact, sample, LogLevelEnum } from '@emitio/core'

const emit = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', 'user.token', '*.secret'] }),
    sample({ rate: 0.1, levels: [LogLevelEnum.DEBUG] }),
  ],
  consent: { analytics: true, errors: true },
})

emit.info('Server started', { port: 3000 })
emit.warn('Slow query', { ms: 1200 })
emit.captureError('Auth', 'login_failed', false, new Error('bad token'))

const reqLog = emit.child({ requestId: 'abc-123' })
reqLog.info('handling request')

import { runWithContext } from '@emitio/core'
await runWithContext({ traceId: 'tx' }, async () => {
  reqLog.info('inside trace')  // context auto-merged
})
```

## Packages

| Package | Use | npm |
|---|---|---|
| `@emitio/core` | Core: logs, transports, plugins, providers | [![npm](https://img.shields.io/npm/v/@emitio/core)](https://www.npmjs.com/package/@emitio/core) |
| `@emitio/react` | React (DOM/RSC): hooks, provider, server actions | [![npm](https://img.shields.io/npm/v/@emitio/react)](https://www.npmjs.com/package/@emitio/react) |
| `@emitio/react-native` | React Native: AppState, navigation, hooks | [![npm](https://img.shields.io/npm/v/@emitio/react-native)](https://www.npmjs.com/package/@emitio/react-native) |
| `@emitio/next` | Next.js: middleware, route handler instrumentation | [![npm](https://img.shields.io/npm/v/@emitio/next)](https://www.npmjs.com/package/@emitio/next) |
| `@emitio/fastify` | Fastify: plugin, request id, child logger per request | [![npm](https://img.shields.io/npm/v/@emitio/fastify)](https://www.npmjs.com/package/@emitio/fastify) |
| `@emitio/hono` | Hono: middleware with context propagation | [![npm](https://img.shields.io/npm/v/@emitio/hono)](https://www.npmjs.com/package/@emitio/hono) |
| `@emitio/otel` | OpenTelemetry: spans + logs bridge | [![npm](https://img.shields.io/npm/v/@emitio/otel)](https://www.npmjs.com/package/@emitio/otel) |
| `@emitio/codegen` | Codegen: YAML schema → TS types, drift detection, JSON Schema/Avro | [![npm](https://img.shields.io/npm/v/@emitio/codegen)](https://www.npmjs.com/package/@emitio/codegen) |

## Features

- **Log levels** — DEBUG, INFO, WARN, ERROR, FATAL with per-transport `minLevel` filtering
- **Transport system** — ConsoleTransport, JSONTransport, HTTPTransport, DevToolsTransport; pluggable
- **Plugin pipeline** — transform or drop entries before transport (redact, sample, rateLimit, normalizeStack)
- **Analytics providers** — unified interface for GA4, PostHog, Sentry, etc. via `AnalyticsProvider`
- **Type-safe events** — `EventRegistry` module augmentation for compile-time event names + payloads
- **Child loggers** — `emit.child({ requestId })` inherits transports, merges bindings
- **AsyncLocalStorage context** — `runWithContext` propagates trace data automatically (Node + edge)
- **Consent gate** — `setConsent({ analytics, errors })` for GDPR compliance
- **Pre-init buffer** — queue events before providers are ready, flush on `init()`
- **Circuit breaker** — wraps any provider to open on repeated failures
- **Zero runtime dependencies** in core

## Quick Start

### Install

```bash
npm install @emitio/core
```

See [npm package page](https://www.npmjs.com/package/@emitio/core) for versions and stats.

### Core

```typescript
import { LoggerStrategy, ConsoleTransport, JSONTransport, LogLevelEnum } from '@emitio/core'

const emit = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

emit.debug('query', { sql: 'SELECT 1' })
emit.info('started', { port: 3000 })
emit.warn('retrying', { attempt: 2 })
emit.error('db down', { host: 'pg-primary' })
emit.fatal('out of memory')

// Analytics error (fires providers + writes to transport)
emit.captureError('Payments', 'charge_failed', true, err, { orderId: 'x' })

// Analytics event
emit.event('purchase', { total: 99 })

// Feature info (analytics)
emit.logFeature('Auth', 'login_success', { method: 'oauth' })
```

### React

```bash
npm install @emitio/core @emitio/react
```

```tsx
import { AnalyticsProvider, useAnalytics, usePageTracking } from '@emitio/react'
import { LoggerStrategy } from '@emitio/core'

const emit = new LoggerStrategy({ /* ... */ })

function App() {
  return (
    <AnalyticsProvider client={emit} autoTrack>
      <Routes />
    </AnalyticsProvider>
  )
}

function ProductPage() {
  usePageTracking('/products')
  const { event } = useAnalytics()
  return <button onClick={() => event('add-to-cart', { id: '1' })}>Add</button>
}
```

### Next.js

```bash
npm install @emitio/core @emitio/next
```

```typescript
// middleware.ts
import { withLogger } from '@emitio/next'
import { NextResponse } from 'next/server'
import { emit } from './lib/emit'

export default withLogger(
  async (req) => NextResponse.next(),
  { logger: emit, trackPageviews: true }
)

// app/api/orders/route.ts
import { instrumentRoute } from '@emitio/next'
import { emit } from './lib/emit'

export const GET = instrumentRoute(
  async (req) => Response.json({ ok: true }),
  { logger: emit, eventName: 'get-orders' }
)
```

### React Native

```bash
npm install @emitio/core @emitio/react-native
```

```tsx
import { AnalyticsProvider, useAnalytics, useScreenTracking } from '@emitio/react-native'
import { LoggerStrategy } from '@emitio/core'

const emit = new LoggerStrategy({ /* ... */ })

export default function App() {
  return (
    <AnalyticsProvider client={emit} trackAppState>
      <RootStack />
    </AnalyticsProvider>
  )
}

function HomeScreen() {
  const { event } = useAnalytics()
  useScreenTracking('Home')
  return <Button onPress={() => event('cta-click')} title="Go" />
}
```

## Transports

| Transport | Description |
|---|---|
| `ConsoleTransport` | Pretty or plain console output |
| `JSONTransport` | NDJSON to stdout (or custom `write`) |
| `HTTPTransport` | Batched POST with retry + exponential backoff |
| `DevToolsTransport` | WebSocket to devtools panel; buffers while disconnected |

```typescript
import { HTTPTransport } from '@emitio/core'

new HTTPTransport({
  url: 'https://logs.example.com/ingest',
  minLevel: LogLevelEnum.WARN,
  batchSize: 50,
  flushIntervalMs: 5000,
  maxRetries: 3,
  headers: { Authorization: 'Bearer token' },
})
```

## Plugins

```typescript
import { redact, sample, rateLimit, normalizeStack } from '@emitio/core'

new LoggerStrategy({
  plugins: [
    redact({ paths: ['password', 'user.token', '*.secret'] }),
    sample({ rate: 0.05, levels: [LogLevelEnum.DEBUG] }),
    rateLimit({ max: 100, windowMs: 1000 }),
    normalizeStack({ maxFrames: 10 }),
  ],
})
```

Plugins are plain functions `(entry: LogEntry) => LogEntry | null`. Return `null` to drop the entry.

## OpenTelemetry

Two complementary paths — use one or both:

```typescript
import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from '@emitio/core'
import { OTelTransport, OTelProvider } from '@emitio/otel'

const emit = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.INFO }),
    new OTelTransport({ loggerProvider }),   // logs → OTel LogRecords
  ],
  providers: [
    new OTelProvider(),                       // events → OTel spans
  ],
})

// These go to both ConsoleTransport and OTelTransport (as LogRecords)
emit.info('request processed', { status: 200 })
emit.error('db timeout', { host: 'pg-1' })

// These go ONLY to OTelProvider (as spans)
emit.event('purchase', { total: 99 })
emit.logScreen('/checkout')
emit.captureError('Payments', 'charge', true, err)
```

| Export | What | For |
|---|---|---|
| `OTelTransport` | Each log call → `otelLogger.emit()` (LogRecord) | Grafana Loki, Elastic, any OTLP log backend |
| `OTelProvider` | Each event/screen/error → `tracer.startSpan()` (Span) | Grafana Tempo, Jaeger, Honeycomb |

## Type-Safe Events

```typescript
declare module '@emitio/core' {
  interface EventRegistry {
    'purchase': { orderId: string; total: number }
    'page-view': { path: string }
  }
}

emit.event('purchase', { orderId: 'x', total: 99 })  // typed
emit.event('unknown', {})  // TS error
```

## Child Loggers + ALS Context

```typescript
// Child logger — inherits all transports and providers, adds bindings
const reqLog = emit.child({ requestId: 'abc-123', userId: 'u-1' })
reqLog.info('request received')  // context: { requestId, userId }

// AsyncLocalStorage — auto-merges into every log call in scope
import { runWithContext } from '@emitio/core'

await runWithContext({ traceId: 'trace-abc' }, async () => {
  await processOrder()  // all logs inside get traceId automatically
})
```

## Consent Gate

```typescript
const emit = new LoggerStrategy({
  consent: { analytics: false, errors: true },
})

// Later, after user consent:
emit.setConsent({ analytics: true })
emit.getConsent() // { analytics: true, errors: true }
```

`analytics: false` blocks `event()`, `logFeature()`, `logScreen()`, `setUser()`.
`errors: false` still writes the error to transports but skips analytics providers.

## Circuit Breaker

```typescript
import { circuitBreaker } from '@emitio/core'
import { PostHogProvider } from './providers/posthog'

const safePostHog = circuitBreaker(new PostHogProvider(), {
  failureThreshold: 5,
  cooldownMs: 30_000,
  onStateChange: (state, name) => console.warn(`[circuit] ${name}: ${state}`),
})

new LoggerStrategy({ providers: [safePostHog] })
```

## Examples

Runnable apps per integration in [`examples/`](./examples):

| App | Stack |
|---|---|
| [next-app](./examples/next-app) | Next.js 15 App Router + `@emitio/next` (middleware + instrumentRoute) |
| [fastify-server](./examples/fastify-server) | Fastify 5 + `@emitio/fastify` (plugin + per-request child logger) |
| [hono-worker](./examples/hono-worker) | Cloudflare Worker (Hono 4) + `HTTPTransport` remote ingest |
| [otel-bridge](./examples/otel-bridge) | Node + NodeSDK + OTLP exporters + `OTelProvider`/`OTelTransport` |
| [react-vite](./examples/react-vite) | Vite + React 19 SPA + `@emitio/react` hooks + provider |
| [react-native-expo](./examples/react-native-expo) | Expo SDK 52 + expo-router + `@emitio/react-native` |

Single-concept snippets in [`examples/`](./examples) (files `01-`...`15-`): redact, child loggers, ALS context, HTTP transport, consent, circuit breaker, event registry, codegen workflow.

## Benchmarks

~1.2M ops/s on Node v22 arm64 (simple `info()` with JSONTransport to `/dev/null`). Faster than winston in context-heavy scenarios, ~2× behind pino in raw throughput. See [BENCHMARKS.md](./BENCHMARKS.md) for full results.

## Migration v2 → v3

See [CHANGELOG.md](./CHANGELOG.md) and [docs/MIGRATION_v2_to_v3.md](./docs/MIGRATION_v2_to_v3.md) for the complete list. Key changes:

```diff
- emit.error('Auth', 'login_failed', true, err)
+ emit.captureError('Auth', 'login_failed', true, err)

- emit.info('Auth', 'login_success', { method: 'oauth' })
+ emit.logFeature('Auth', 'login_success', { method: 'oauth' })

- declare global { interface EVENT_TAGS { ... } }
+ declare module '@emitio/core' { interface EventRegistry { ... } }
```

## Contributing

PRs welcome. Run `bun install && bun run test` from the repo root.

### AI-Assisted Development

This repo includes a [Claude Code skill](./.claude/skills/logger/SKILL.md) with project conventions, build patterns, and common workflows. It's auto-discovered when working in this directory — no setup needed. Just clone and open.

## License

MIT
