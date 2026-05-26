# Examples

Two categories:

## Runnable apps (per integration)

Full skeleton apps. Each `cd` + `npm install` + run.

| App | Stack | Path |
|---|---|---|
| Next.js App Router | `@movibe/logger-next` middleware + instrumentRoute | [next-app/](./next-app) |
| Fastify server | `@movibe/logger-fastify` plugin + child logger per request | [fastify-server/](./fastify-server) |
| Hono Cloudflare Worker | `@movibe/logger-hono` + HTTPTransport (edge) | [hono-worker/](./hono-worker) |
| OpenTelemetry bridge | `@movibe/logger-otel` + NodeSDK + OTLP exporters | [otel-bridge/](./otel-bridge) |
| React + Vite SPA | `@movibe/logger-react` hooks + error boundary | [react-vite/](./react-vite) |
| Expo (React Native) | `@movibe/logger-react-native` + expo-router | [react-native-expo/](./react-native-expo) |

## Snippet references

Single-concept snippets. Documentation only — not standalone runnable.

| # | Topic | File |
|---|---|---|
| 01 | Basic Node.js setup | [01-basic-node.ts](./01-basic-node.ts) |
| 02 | Redaction plugin | [02-with-redact.ts](./02-with-redact.ts) |
| 03 | Child loggers | [03-child-loggers.ts](./03-child-loggers.ts) |
| 04 | Async context (ALS) | [04-async-context.ts](./04-async-context.ts) |
| 05 | HTTP transport | [05-http-transport.ts](./05-http-transport.ts) |
| 06 | Consent gate (GDPR) | [06-consent-gate.ts](./06-consent-gate.ts) |
| 07 | Circuit breaker | [07-circuit-breaker.ts](./07-circuit-breaker.ts) |
| 08 | Typed event registry | [08-event-registry.ts](./08-event-registry.ts) |
| 09 | React app | [09-react-app.tsx](./09-react-app.tsx) |
| 10 | Next.js middleware | [10-nextjs-middleware.ts](./10-nextjs-middleware.ts) |
| 11 | Fastify plugin | [11-fastify-plugin.ts](./11-fastify-plugin.ts) |
| 12 | Hono middleware | [12-hono-middleware.ts](./12-hono-middleware.ts) |
| 13 | React Native | [13-react-native.tsx](./13-react-native.tsx) |
| 14 | OpenTelemetry bridge | [14-otel-bridge.ts](./14-otel-bridge.ts) |
| 15 | Codegen workflow | [15-codegen-workflow.md](./15-codegen-workflow.md) |
