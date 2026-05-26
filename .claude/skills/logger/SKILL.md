---
name: emit-logger
description: Use when a user asks about installing, configuring, or using @emitio/core in any project — Node, React, React Native, Next.js, Fastify, Hono, Cloudflare Workers. Also use when working on the monorepo itself (adding features, fixing bugs, running benchmarks, modifying any package under packages/)
---

# @emitio/core

## Overview

Universal logging + analytics for TypeScript — Node, browser, edge, React Native. Published as [`@emitio/core`](https://www.npmjs.com/package/@emitio/core) on npm. Dual-purpose architecture: **analytics** (event/screen/identify dispatched to providers like PostHog) and **observability** (debug/info/warn/error/fatal piped through transports to console, JSON, HTTP, or OTel). Both layers run concurrently on every call.

## Project Detection & Installation

When a user asks to install or use the logger, first identify the project type then recommend the correct packages.

### Detection Heuristics

| Signal | Project Type | Install |
|---|---|---|
| `package.json` has `next` | Next.js | `@emitio/core` + `@emitio/next` |
| `package.json` has `next` + `react` | Next.js App Router | `@emitio/core` + `@emitio/next` + `@emitio/react` |
| `package.json` has `react` + `react-dom`, no `next` | React SPA | `@emitio/core` + `@emitio/react` |
| `package.json` has `react-native` | React Native | `@emitio/core` + `@emitio/react-native` |
| `package.json` has `fastify` | Fastify | `@emitio/core` + `@emitio/fastify` |
| `package.json` has `hono` | Hono | `@emitio/core` + `@emitio/hono` |
| `package.json` has `wrangler` or `@cloudflare/workers` | Cloudflare Worker | `@emitio/core` + `@emitio/hono` (if using Hono) or just `@emitio/core` |
| `package.json` has `@opentelemetry/api` | OTel-instrumented | `@emitio/core` + `@emitio/otel` |
| `tsconfig.json` exists, no framework | Plain Node/TS | `@emitio/core` |
| `package.json` has `vite`, `esbuild`, or `webpack` + `react` | React SPA (bundler) | `@emitio/core` + `@emitio/react` |

### Detection Flow

```
1. Read user's package.json to identify framework
2. Also check for tsconfig.json, vite.config.*, next.config.*
3. Cross-reference with the heuristic table above
4. Recommend install commands (always include @emitio/core as base)
5. Show the minimal setup code snippet for that project type (see snippets below)
6. If user also mentions analytics providers (PostHog, Sentry, etc.) or OTel, layer those on top
```

### Setup Snippets by Project Type

**Node / plain TypeScript:**
```typescript
import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from '@emitio/core'
const logger = new LoggerStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.INFO })],
})
emit.info('started', { port: 3000 })
```

**Next.js App Router:**
```typescript
// lib/emit.ts
import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from '@emitio/core'
export const logger = new LoggerStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.INFO })],
})

// middleware.ts
import { withLogger } from '@emitio/next'
export default withLogger(async (req) => NextResponse.next(), { logger, trackPageviews: true })
```

**Next.js + React (hybrid — logger in middleware + context in client):**
```typescript
// middleware.ts — server-side logging via @emitio/next
// app/layout.tsx — wrap with <AnalyticsProvider client={logger}> from @emitio/react
```

**React SPA:**
```tsx
import { AnalyticsProvider, useAnalytics, usePageTracking } from '@emitio/react'
function App() {
  return <AnalyticsProvider client={logger} autoTrack><Routes /></AnalyticsProvider>
}
```

**React Native:**
```tsx
import { AnalyticsProvider, useAnalytics, useScreenTracking } from '@emitio/react-native'
export default function App() {
  return <AnalyticsProvider client={logger} trackAppState><RootStack /></AnalyticsProvider>
}
```

**Fastify:**
```typescript
import { loggerPlugin } from '@emitio/fastify'
app.register(loggerPlugin, { logger })
// request.log_.info('handling') — child logger with requestId auto-bound
```

**Hono:**
```typescript
import { loggerMiddleware } from '@emitio/hono'
app.use('*', loggerMiddleware({ logger }))
// c.get('log').info('handling')
```

**OTel:**
```typescript
import { OTelTransport, OTelProvider } from '@emitio/otel'
new LoggerStrategy({
  transports: [new OTelTransport()],  // logs → LogRecords
  providers: [new OTelProvider()],    // events → spans
})
```

## Dual-Purpose Architecture

- **Analytics layer** — `event()`, `logScreen()`, `setUser()`, `captureError()` dispatched to `AnalyticsProvider[]` (PostHog, Amplitude, GA4, Sentry)
- **Observability layer** — `debug/info/warn/error/fatal()` piped through `Transport[]` (Console, JSON, HTTP, OTel)

Both layers run on every call. `emit.error()` writes to all transports AND fires analytics providers. `OTelTransport` bridges logs to OTLP LogRecords; `OTelProvider` bridges events to OTLP Spans (Grafana, Tempo, Jaeger, Honeycomb).

## Project Structure (Monorepo)

All packages published on npm under the `@emit` scope.

```
packages/
  core/         @emitio/core              — LoggerStrategy, transports, plugins, types
  react/        @emitio/react         — React hooks, provider + RSC server
  react-native/ @emitio/react-native   — RN hooks, provider, navigation, AppState
  fastify/      @emitio/fastify       — Fastify plugin (per-request logging)
  next/         @emitio/next          — Next.js middleware + route handler
  hono/         @emitio/hono          — Hono middleware (request id, child logger)
  codegen/      @emitio/codegen       — CLI: YAML schema → TypeScript + Avro + JSON Schema
  otel/         @emitio/otel          — OpenTelemetry transport + provider
```

## Build System

All packages use **Bun** (`bun build`) for bundling. Build scripts follow a consistent pattern:

```
bun build ./src/index.ts --outdir=dist --target=node --format=esm --external=pkg
bun build ./src/index.ts --target=node --format=cjs --outfile=dist/index.cjs --external=pkg
```

Every package has `build`, `build:types`, `build:all`, and `prepack` scripts. Core produces 6 output bundles (ESM/CJS for Node, Browser, Worker/Edge) plus a `/test` subpath export. All other packages produce 2 bundles (ESM + CJS), except codegen which is CLI-only.

**Key conventions:**
- Build with `--external` for peer/runtime dependencies (never bundle them)
- Package `type: "module"` in every package.json (ESM-first)
- Dual CJS/ESM via `main` + `module` + conditional `exports`
- Multi-runtime via `exports` conditions: `workerd`, `edge-light`, `browser`, `import`, `require`

## Testing

**Test runner: Vitest** (configured at root `vitest.config.ts`).

Root configuration: `{ globals: false, environment: 'node', include: ['packages/*/src/**/*.test.ts'] }`

Exceptions: `react` and `codegen` use `bun test`. Files: `src/__tests__/*.test.ts`. Imports: `import { test, expect, describe, vi } from 'vitest'`. Mocking: `vi.spyOn()`, `vi.fn()`.

```
bun run test              # vitest run (all packages)
bun run test:watch        # vitest watch mode
bun run test:coverage     # vitest run --coverage
```

## Benchmarks

**Tool: tinybench** — compares @emitio/core vs pino vs winston.

```
bun run bench          # standalone (tsx packages/core/bench/index.ts)
bun run bench:compare  # vs pino/winston (tsx packages/core/bench/compare.ts)
```

Results documented in `BENCHMARKS.md`. Always use `/dev/null` writes for fair comparison.

## Package Conventions

- `name`: `@emitio/<suffix>` (or `@emitio/core` for core)
- `type`: `"module"`, `main`: `./dist/index.cjs`, `module`: `./dist/index.js`
- `exports`: conditional (`import`/`require`/`browser`/`workerd`/`edge-light`)
- `files`: `["dist", "README.md", "LICENSE"]`
- **Core:** zero runtime deps
- **Framework packages:** framework as peerDependency, `@emitio/core` as devDependency
- **codegen:** only package with non-peer runtime dep (`js-yaml`)

## Code Conventions

- TypeScript strict mode, enums for log levels
- Interface over type for public APIs, readonly properties
- Explicit return types, optional chaining, early returns
- Zero comments by default — code should be self-documenting
- ESLint config at `packages/core/.eslintrc.json`

## Release

Uses **Changesets**: `bun run changeset` → `bun run version` → `bun run release`

## Common Workflows

### Add a new feature to core
1. Modify source in `packages/core/src/`
2. Add/update tests in `packages/core/src/__tests__/`
3. Run `bun run test`, then `bun run build` from root
4. Add changeset if publishing

### Add a new package
1. Mirror structure of fastify/hono/next as template
2. Follow same build scripts pattern, add to root workspaces + build chain

### Compare performance
Run `bun run bench:compare`, update BENCHMARKS.md with results (include `node -v`, `uname -mrs`).

### Add a transport or plugin
Create in `packages/core/src/`, implement `Transport` or `Plugin` from `types.ts`, export from `index.ts`, add tests.
