# otel-bridge example

End-to-end Node.js example wiring [`@movibe/logger`](../../packages/core) into
the OpenTelemetry SDK via [`@movibe/logger-otel`](../../packages/otel).

It demonstrates:

- `OTelProvider` — analytics events (`logger.event`, `logger.captureError`,
  `logger.screen`, `logger.identify`) become OTel **spans**.
- `OTelTransport` — structured logs (`logger.info`, `logger.error`, ...)
  become OTel **log records**.
- Side-by-side `ConsoleTransport` so you still see pretty output locally.
- A real `NodeSDK` bootstrap that loads **before** application code via the
  Node `--import` loader hook.

## Layout

```
src/
  tracing.ts   # NodeSDK + OTLP exporters; must load FIRST
  logger.ts    # LoggerStrategy with OTelProvider + OTelTransport + Console
  index.ts     # main(): 5 events + 1 captured error
```

## Install + build

From the monorepo root (uses the workspace versions of `@movibe/logger` and
`@movibe/logger-otel`):

```bash
bun install
bun run --filter @movibe/logger build
bun run --filter @movibe/logger-otel build:all
cd examples/otel-bridge
bun run build
```

## Run

Point the example at any OTLP/HTTP collector (the OpenTelemetry Collector,
Jaeger with OTLP enabled, Tempo, Honeycomb's OTLP endpoint, etc.):

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  node --import ./tracing.js dist/index.js
```

Notes:

- `--import ./tracing.js` makes Node load the SDK bootstrap before
  `dist/index.js` so auto-instrumentations can patch `http`, `fs`, etc.
- The default endpoint is `http://localhost:4318`. Traces are POSTed to
  `${endpoint}/v1/traces` and logs to `${endpoint}/v1/logs`.
- `OTEL_SERVICE_NAME` overrides the service name (default
  `otel-bridge-example`).

### Quick local collector

If you do not have a collector running, the official image works out of the
box:

```bash
docker run --rm -p 4318:4318 \
  otel/opentelemetry-collector:latest
```

## Expected output

On stdout (via `ConsoleTransport`):

```
[INFO] service starting { pid: 12345 }
[INFO] order received { orderId: 'ord-001', total: 49.9 }
... (5 orders) ...
[ERROR] Payments.charge_timeout: downstream payment provider timed out
[INFO] service finished simulation { events: 5, errors: 1 }
```

In your OTel backend:

- **Spans**: `analytics.order.created` (×5), `analytics.error.Payments.charge_timeout` (×1)
- **Logs**: 7 records (5 INFO + 1 ERROR + 1 INFO), with `error.message`,
  `error.stack`, `error.name` attributes on the captured error.
