# @emit-io/otel

OpenTelemetry bridge for [@emit-io/core](https://github.com/movibe/emit-io) — emit OTel spans for analytics events and bridge structured logs into the OTel Logs API.

## Install

```bash
npm install @emit-io/core @emit-io/otel \
  @opentelemetry/api @opentelemetry/api-logs
```

You are responsible for initialising the OTel SDK (NodeSDK, etc.) before constructing the emit instance.

## Quick Start

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'

import { LoggerStrategy, LogLevelEnum } from '@emit-io/core'
import { OTelProvider, OTelTransport } from '@emit-io/otel'

// 1. Init OTel SDK externally
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://collector:4318/v1/traces' }),
})
sdk.start()

const loggerProvider = new LoggerProvider()
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new OTLPLogExporter({ url: 'http://collector:4318/v1/logs' }))
)

// 2. Wire into @emit-io/core
const emit = new LoggerStrategy({
  transports: [
    new OTelTransport({
      minLevel: LogLevelEnum.INFO,
      loggerProvider,           // optional: defaults to logs.getLoggerProvider()
      loggerName: 'my-service',
    }),
  ],
  providers: [
    new OTelProvider({
      tracerName: 'my-service', // optional: defaults to '@emit-io/otel'
    }),
  ],
})

// Logs → OTel Logs API
emit.info('order created', { orderId: 'x' })
emit.error('payment failed', { code: 'card_declined' })

// Analytics events → OTel spans
emit.event('purchase', { orderId: 'x', total: 99 })
emit.captureError('Payments', 'charge_failed', true, new Error('declined'))
```

## API

### `OTelTransport`

Implements `Transport`. Bridges `LogEntry` objects into the OTel Logs API (`@opentelemetry/api-logs`).

```typescript
new OTelTransport({
  name?: string           // transport name (default: 'otel')
  minLevel?: LogLevel     // default: DEBUG
  loggerName?: string     // OTel logger name (default: '@emit-io/otel')
  loggerProvider?: LoggerProvider  // default: logs.getLoggerProvider()
})
```

Log level mapping:

| @emit-io/core | OTel SeverityNumber |
|---|---|
| DEBUG | DEBUG |
| INFO | INFO |
| WARN | WARN |
| ERROR | ERROR |
| FATAL | FATAL |

Error fields are included as `error.message`, `error.stack`, and `error.name` attributes.

### `OTelProvider`

Implements `AnalyticsProvider`. Creates OTel spans for analytics events, identifies, screen views, and errors.

```typescript
new OTelProvider({
  name?: string       // provider name (default: 'otel')
  enabled?: boolean   // default: true
  tracerName?: string // OTel tracer name (default: '@emit-io/otel')
})
```

| Method called | OTel span name |
|---|---|
| `event(name, props)` | `analytics.<name>` |
| `identify(user)` | `analytics.identify` |
| `screen(name, params)` | `analytics.screen.<name>` |
| `error(feature, name, ...)` | `analytics.error.<feature>.<name>` |

The OTel SDK must be started **before** constructing `OTelProvider` or `OTelTransport`, since they call `trace.getTracer` and `logs.getLoggerProvider` at construction time when no explicit provider is passed.

## Peer Dependencies

| Package | Version |
|---|---|
| `@emit-io/core` | `^1.0.0` |
| `@opentelemetry/api` | `^1.7.0` |
| `@opentelemetry/api-logs` | `^0.50.0` |

## License

MIT
