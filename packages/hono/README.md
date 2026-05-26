# @emitio/hono

Hono middleware for [@emitio/core](https://github.com/Emit-logger/emit) — request ID, child logger, timings, and ALS context propagation.

## Install

```bash
npm install @emitio/core @emitio/hono
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emitio/core'
import { loggerMiddleware } from '@emitio/hono'

const emit = new LoggerStrategy({
  transports: [new JSONTransport({ minLevel: LogLevelEnum.INFO })],
})

const app = new Hono()

app.use('*', loggerMiddleware({ logger }))

app.get('/orders', (c) => {
  const log = c.get('logger')   // child LoggerStrategy with { requestId, method, path }
  const requestId = c.get('requestId')

  log.info('fetching orders')
  return c.json({ orders: [] })
})

export default app
```

## API

### `loggerMiddleware(options)`

```typescript
import { loggerMiddleware } from '@emitio/hono'
import type { LoggerMiddlewareOptions } from '@emitio/hono'

const options: LoggerMiddlewareOptions = {
  logger,                          // required: LoggerStrategy instance
  requestIdHeader: 'x-request-id', // default: 'x-request-id'
  autoLog: true,                   // default: true
  contextKey: 'logger',            // default: 'logger' — key for c.get()
}

app.use('*', loggerMiddleware(options))
```

### Context Values

After the middleware runs, the Hono context exposes:

| Key | Type | Description |
|---|---|---|
| `c.get('logger')` | `LoggerStrategy` | Child logger with `{ requestId, method, path }` |
| `c.get('requestId')` | `string` | Request ID from header or generated UUID |

### Behaviour

- `onRequest` — logs `request-start` with `{ method, path }` when `autoLog: true`
- `onResponse` — logs `request-complete` with `{ status, durationMs }`
- `onError` — logs `request-failed` with `{ status, durationMs, error }`, then re-throws
- Sets `x-request-id` response header
- Runs the downstream handler inside `runWithContext({ requestId, path, method })` so all nested log calls automatically include the request context

### ALS Context Example

```typescript
app.get('/checkout', async (c) => {
  const log = c.get('logger')

  // All logger calls inside this handler (and any async callees)
  // automatically include requestId from ALS — no manual threading needed.
  await processOrder()

  return c.json({ ok: true })
})

async function processOrder() {
  // emit.info here also picks up requestId from ALS context
  emit.info('order processed')
}
```

## Peer Dependencies

| Package | Version |
|---|---|
| `@emitio/core` | `^1.0.0` |
| `hono` | `^4.0.0` |

## License

MIT
