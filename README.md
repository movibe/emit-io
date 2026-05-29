# emit-io

<p align="center">
  <img src="./assets/logo.svg" alt="emit-io logo" width="500" />
</p>

<h3 align="center">One type-safe API for logs, analytics, and errors — everywhere your TypeScript runs.</h3>

<p align="center">
  Stop wiring together a logger, an analytics SDK, and an error tracker.<br/>
  emit-io unifies all three behind a single, zero-dependency API that works identically<br/>
  on Node.js, Cloudflare Workers, browser, and React Native.
</p>

<p align="center">
  <strong>Logs · Analytics · Errors &nbsp;·&nbsp; One API &nbsp;·&nbsp; Node · Edge · Browser · React Native &nbsp;·&nbsp; Zero deps · Fully typed</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/emit-io-core"><img alt="npm version" src="https://img.shields.io/npm/v/emit-io-core"/></a>
  <a href="https://www.npmjs.com/package/emit-io-core"><img alt="npm downloads" src="https://img.shields.io/npm/dm/emit-io-core"/></a>
  <a href="https://bundlephobia.com/package/emit-io-core"><img alt="bundle size" src="https://img.shields.io/bundlephobia/minzip/emit-io-core"/></a>
  <a href="https://www.npmjs.com/package/emit-io-core"><img alt="TypeScript" src="https://img.shields.io/npm/types/emit-io-core"/></a>
  <a href="https://github.com/movibe/emit-io/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/movibe/emit-io/actions/workflows/ci.yml/badge.svg"/></a>
  <a href="https://codecov.io/gh/movibe/emit-io"><img alt="codecov" src="https://codecov.io/gh/movibe/emit-io/branch/main/graph/badge.svg"/></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/npm/l/emit-io-core"/></a>
</p>

---

- **Replace 3 tools with 1** — logger + analytics SDK + error tracker behind one typed object. No config drift, no duplicated consent flows.
- **Write once, run anywhere** — identical API on Node.js, Cloudflare Workers, browser, and React Native.
- **Catch event typos at compile time** — `EventRegistry` augmentation makes every `emit.event()` call fully type-checked.
- **GDPR-ready by default** — built-in consent gate (`{ analytics, errors }`) blocks providers until the user opts in. Pre-init buffer replays queued events on consent.
- **Governed analytics events** — define events in YAML, auto-generate typed trackers, detect schema drift in CI.

```bash
npm install emit-io-core
```

→ Jump to [Quick Start](#quick-start) or skip to the [full comparison](#why-emit-io).

---

## Table of Contents

- [Why emit-io?](#why-emit-io)
- [Ecosystem](#ecosystem)
- [Packages](#packages)
- [Features](#features)
- [Quick Start](#quick-start)
  - [Core](#core)
  - [React](#react)
  - [Next.js](#nextjs)
  - [React Native](#react-native-1)
- [Transports](#transports)
- [Plugins](#plugins)
- [Codegen](#codegen)
- [OpenTelemetry](#opentelemetry)
- [Type-Safe Events](#type-safe-events)
- [Child Loggers + ALS Context](#child-loggers--als-context)
- [Consent Gate](#consent-gate)
- [Circuit Breaker](#circuit-breaker)
- [Examples](#examples)
- [Benchmarks](#benchmarks)
- [Migration v2 → v3](#migration-v2--v3)
- [Contributing](#contributing)
- [License](#license)

---

## Why emit-io?

**The usual pattern: one library for logs, another for product events, another for errors.** Three SDK versions to track, three consent flows to wire up, three runtime compatibility matrices to worry about — and a Sentry `dsn`, a Segment `writeKey`, and a pino `instance` living as separate globals across your codebase.

Most TypeScript stacks bolt together **three separate systems**: a logger (pino/winston) for structured logs, an analytics SDK (Segment/PostHog/GA4) for product events, and an error tracker (Sentry) for crashes — each with its own API, configuration, consent model, and runtime compatibility matrix.

**emit-io collapses all three into one type-safe API** that runs identically on Node.js, Cloudflare Workers, browser, and React Native:

| | pino | winston | Sentry | Segment | **emit-io** |
|---|:---:|:---:|:---:|:---:|:---:|
| Structured logs (DEBUG→FATAL) | ✅ | ✅ | — | — | ✅ |
| Product analytics events | — | — | — | ✅ | ✅ |
| Error capture | — | — | ✅ | — | ✅ |
| Type-safe event registry | — | — | — | — | ✅ |
| GDPR consent gate | — | — | partial | partial | ✅ |
| YAML-driven codegen | — | — | — | — | ✅ |
| Runs on edge / Cloudflare Workers | — | — | partial | — | ✅ |
| Runs on React Native | — | — | partial | partial | ✅ |
| Zero runtime deps (core) | ✅ | — | — | — | ✅ |
| Pre-init analytics buffer | — | — | — | — | ✅ |
| Circuit breaker for providers | — | — | — | — | ✅ |

```typescript
import { EmitIoStrategy, JSONTransport, ConsoleTransport, redact, sample, LogLevelEnum } from 'emit-io-core'

const emit = new EmitIoStrategy({
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

import { runWithContext } from 'emit-io-core'
await runWithContext({ traceId: 'tx' }, async () => {
  reqLog.info('inside trace')  // context auto-merged
})
```

---

## Ecosystem

```
emit-io-core          ← zero-dep core: transports, plugins, providers, ALS context
├── emit-io-react          React hooks + AnalyticsProvider + server actions
├── emit-io-react-native   Expo/RN hooks + AppState + navigation tracking
├── emit-io-next           Next.js middleware + instrumentRoute
├── emit-io-fastify        Fastify plugin + per-request child logger
├── emit-io-hono           Hono middleware + ALS propagation
├── emit-io-otel           OTel spans (OTelProvider) + OTel logs (OTelTransport)
└── emit-io-codegen        CLI: YAML events → typed TS tracker + drift detection
```

All 8 packages share a single linked version and are released together on every push to `main`.

---

## Packages

| Package | Use | npm |
|---|---|---|
| `emit-io-core` | Core: logs, transports, plugins, providers | [![npm](https://img.shields.io/npm/v/emit-io-core)](https://www.npmjs.com/package/emit-io-core) |
| `emit-io-react` | React (DOM/RSC): hooks, provider, server actions | [![npm](https://img.shields.io/npm/v/emit-io-react)](https://www.npmjs.com/package/emit-io-react) |
| `emit-io-react-native` | React Native: AppState, navigation, hooks | [![npm](https://img.shields.io/npm/v/emit-io-react-native)](https://www.npmjs.com/package/emit-io-react-native) |
| `emit-io-next` | Next.js: middleware, route handler instrumentation | [![npm](https://img.shields.io/npm/v/emit-io-next)](https://www.npmjs.com/package/emit-io-next) |
| `emit-io-fastify` | Fastify: plugin, request id, child logger per request | [![npm](https://img.shields.io/npm/v/emit-io-fastify)](https://www.npmjs.com/package/emit-io-fastify) |
| `emit-io-hono` | Hono: middleware with context propagation | [![npm](https://img.shields.io/npm/v/emit-io-hono)](https://www.npmjs.com/package/emit-io-hono) |
| `emit-io-otel` | OpenTelemetry: spans + logs bridge | [![npm](https://img.shields.io/npm/v/emit-io-otel)](https://www.npmjs.com/package/emit-io-otel) |
| `emit-io-codegen` | Codegen: YAML schema → TS types, drift detection, JSON Schema/Avro | [![npm](https://img.shields.io/npm/v/emit-io-codegen)](https://www.npmjs.com/package/emit-io-codegen) |

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
npm install emit-io-core
```

See [npm package page](https://www.npmjs.com/package/emit-io-core) for versions and stats.

### Core

```typescript
import { EmitIoStrategy, ConsoleTransport, JSONTransport, LogLevelEnum } from 'emit-io-core'

const emit = new EmitIoStrategy({
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
npm install emit-io-core emit-io-react
```

```tsx
import { AnalyticsProvider, useAnalytics, usePageTracking } from 'emit-io-react'
import { EmitIoStrategy } from 'emit-io-core'

const emit = new EmitIoStrategy({ /* ... */ })

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
npm install emit-io-core emit-io-next
```

```typescript
// middleware.ts
import { withLogger } from 'emit-io-next'
import { NextResponse } from 'next/server'
import { emit } from './lib/emit'

export default withLogger(
  async (req) => NextResponse.next(),
  { logger: emit, trackPageviews: true }
)

// app/api/orders/route.ts
import { instrumentRoute } from 'emit-io-next'
import { emit } from './lib/emit'

export const GET = instrumentRoute(
  async (req) => Response.json({ ok: true }),
  { logger: emit, eventName: 'get-orders' }
)
```

### React Native

```bash
npm install emit-io-core emit-io-react-native
```

```tsx
import { AnalyticsProvider, useAnalytics, useScreenTracking } from 'emit-io-react-native'
import { EmitIoStrategy } from 'emit-io-core'

const emit = new EmitIoStrategy({ /* ... */ })

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

All transports support `enabled?: boolean` (default `true`). Toggle at runtime via feature flags:

```typescript
const devtools = new DevToolsTransport({ enabled: false }) // off in production
// later: devtools.enabled = true   // enable for debugging
```

| Transport | Description |
|---|---|
| `ConsoleTransport` | Pretty or plain console output |
| `JSONTransport` | NDJSON to stdout (or custom `write`) |
| `HTTPTransport` | Batched POST with retry + exponential backoff |
| `DevToolsTransport` | WebSocket to devtools panel; buffers while disconnected |

```typescript
import { HTTPTransport } from 'emit-io-core'

new HTTPTransport({
  url: 'https://logs.example.com/ingest',
  minLevel: LogLevelEnum.WARN,
  enabled: process.env.NODE_ENV === 'production',
  batchSize: 50,
  flushIntervalMs: 5000,
  maxRetries: 3,
  headers: { Authorization: 'Bearer token' },
})
```

## Plugins

```typescript
import { redact, sample, rateLimit, normalizeStack } from 'emit-io-core'

new EmitIoStrategy({
  plugins: [
    redact({ paths: ['password', 'user.token', '*.secret'] }),
    sample({ rate: 0.05, levels: [LogLevelEnum.DEBUG] }),
    rateLimit({ max: 100, windowMs: 1000 }),
    normalizeStack({ maxFrames: 10 }),
  ],
})
```

Plugins are plain functions `(entry: LogEntry) => LogEntry | null`. Return `null` to drop the entry.

## Codegen

**The standout differentiator**: define your analytics events once in YAML, get a fully typed TypeScript tracker, automatic CI drift detection, and JSON Schema / Avro export.

```bash
npm install -D emit-io-codegen
```

**1. Define events in YAML:**

```yaml
# events.yml
events:
  purchase:
    description: User completes a purchase
    properties:
      orderId:
        type: string
        required: true
      total:
        type: number
        required: true
      currency:
        type: string
        pii: false
  page_view:
    description: Page viewed
    properties:
      path:
        type: string
        required: true
```

**2. Generate the typed tracker:**

```bash
npx emit-io-codegen generate --input events.yml --output src/tracker.ts
```

This produces a `tracker.ts` with full `EventRegistry` module augmentation — so every `emit.event('purchase', ...)` call is type-checked against your YAML schema.

**3. Detect schema drift in CI:**

```bash
npx emit-io-codegen check --input events.yml --output src/tracker.ts
# Exits non-zero if generated code is out of sync — use in pre-commit or CI
```

**4. Export to JSON Schema or Avro:**

```bash
npx emit-io-codegen export --format json-schema --input events.yml
npx emit-io-codegen export --format avro --input events.yml
```

**PII detection**: the codegen flags properties marked `pii: true`, letting you enforce redaction rules per event in your pipeline.

See [`examples/15-codegen-workflow.md`](./examples/15-codegen-workflow.md) for a full end-to-end example.

## OpenTelemetry

Two complementary paths — use one or both:

```typescript
import { EmitIoStrategy, ConsoleTransport, LogLevelEnum } from 'emit-io-core'
import { OTelTransport, OTelProvider } from 'emit-io-otel'

const emit = new EmitIoStrategy({
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
declare module 'emit-io-core' {
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
import { runWithContext } from 'emit-io-core'

await runWithContext({ traceId: 'trace-abc' }, async () => {
  await processOrder()  // all logs inside get traceId automatically
})
```

## Consent Gate

```typescript
const emit = new EmitIoStrategy({
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
import { circuitBreaker } from 'emit-io-core'
import { PostHogProvider } from './providers/posthog'

const safePostHog = circuitBreaker(new PostHogProvider(), {
  failureThreshold: 5,
  cooldownMs: 30_000,
  onStateChange: (state, name) => console.warn(`[circuit] ${name}: ${state}`),
})

new EmitIoStrategy({ providers: [safePostHog] })
```

## Examples

Runnable apps per integration in [`examples/`](./examples):

| App | Stack |
|---|---|
| [next-app](./examples/next-app) | Next.js 15 App Router + `emit-io-next` (middleware + instrumentRoute) |
| [fastify-server](./examples/fastify-server) | Fastify 5 + `emit-io-fastify` (plugin + per-request child logger) |
| [hono-worker](./examples/hono-worker) | Cloudflare Worker (Hono 4) + `HTTPTransport` remote ingest |
| [otel-bridge](./examples/otel-bridge) | Node + NodeSDK + OTLP exporters + `OTelProvider`/`OTelTransport` |
| [react-vite](./examples/react-vite) | Vite + React 19 SPA + `emit-io-react` hooks + provider |
| [react-native-expo](./examples/react-native-expo) | Expo SDK 52 + expo-router + `emit-io-react-native` |

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
+ declare module 'emit-io-core' { interface EventRegistry { ... } }
```

## Contributing

PRs welcome. Run `bun install && bun run test` from the repo root.

### AI-Assisted Development

This repo includes a [Claude Code skill](./.claude/skills/logger/SKILL.md) with project conventions, build patterns, and common workflows. It's auto-discovered when working in this directory — no setup needed. Just clone and open.

## License

MIT
