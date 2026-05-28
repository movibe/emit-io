# emit-io-fastify

Fastify plugin for [emit-io-core](https://github.com/movibe/emit-io) — per-request child logger, request ID, and automatic hook timings.

## Install

```bash
npm install emit-io-core emit-io-fastify
```

`fastify-plugin` is a direct dependency and installed automatically.

## Quick Start

```typescript
import Fastify from 'fastify'
import { EmitIoStrategy, JSONTransport, LogLevelEnum } from 'emit-io-core'
import { loggerPlugin } from 'emit-io-fastify'

const emit = new EmitIoStrategy({
  transports: [new JSONTransport({ minLevel: LogLevelEnum.INFO })],
})

const app = Fastify({ logger: false })

await app.register(loggerPlugin, { logger })

app.get('/orders', async (req) => {
  req.log_.info('fetching orders')
  // req.log_ is a child logger with { requestId, method, path } already bound
  return { orders: [] }
})

await app.listen({ port: 3000 })
```

## API

### `loggerPlugin`

A `fastify-plugin` compatible with Fastify 4.x and 5.x.

```typescript
import { loggerPlugin } from 'emit-io-fastify'
import type { LoggerPluginOptions } from 'emit-io-fastify'

await app.register(loggerPlugin, {
  logger,                          // required: EmitIoStrategy instance
  requestIdHeader: 'x-request-id', // default: 'x-request-id'
  autoLog: true,                   // default: true — logs request-start and request-complete
})
```

### Request Decorators

After registration, every request has:

| Decorator | Type | Description |
|---|---|---|
| `req.log_` | `EmitIoStrategy` | Child logger bound with `{ requestId, method, path }` |
| `req.requestId` | `string` | Request ID from header or generated UUID |

```typescript
app.get('/users/:id', async (req) => {
  const { id } = req.params as { id: string }
  req.log_.info('get user', { userId: id })
  req.log_.captureError('Users', 'not_found', false, new Error('404'), { id })
  return { user: null }
})
```

### Hook Behaviour

When `autoLog: true` (default):

- `onRequest` — logs `request-start` with `{ method, path }`
- `onResponse` — logs `request-complete` with `{ status, durationMs }`
- `onError` — logs `request-failed` with `{ method, path, error }`

The `x-request-id` (or configured header) is echoed back in the response.

### TypeScript Augmentation

The plugin augments Fastify's types automatically:

```typescript
// No import needed — available after app.register(loggerPlugin, ...)
app.get('/', async (req) => {
  req.log_    // EmitIoStrategy
  req.requestId  // string
})
```

## Peer Dependencies

| Package | Version |
|---|---|
| `emit-io-core` | `^1.0.0` |
| `fastify` | `^4.0.0 \|\| ^5.0.0` |

## License

MIT
