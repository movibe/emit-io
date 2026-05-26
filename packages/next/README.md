# @emit-io/next

Next.js bindings for [@emit-io/core](https://github.com/movibe/emit-io) — middleware logging and App Router route handler instrumentation.

## Install

```bash
npm install @emit-io/core @emit-io/next
```

## Quick Start

```typescript
// lib/emit.ts
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emit-io/core'

export const emit = new LoggerStrategy({
  transports: [new JSONTransport({ minLevel: LogLevelEnum.INFO })],
})
```

```typescript
// middleware.ts
import { withLogger } from '@emit-io/next'
import { NextResponse } from 'next/server'
import { logger } from './lib/logger'

export default withLogger(
  async (req) => NextResponse.next(),
  { logger, trackPageviews: true }
)

export const config = { matcher: ['/((?!_next|favicon).*)'] }
```

```typescript
// app/api/orders/route.ts
import { instrumentRoute } from '@emit-io/next'
import { logger } from '@/lib/logger'

export const GET = instrumentRoute(
  async (req) => Response.json({ orders: [] }),
  { logger, eventName: 'get-orders' }
)
```

## API

### `withLogger(handler, options)`

Wraps a Next.js middleware function. Adds:
- `requestId` from `x-request-id` header (or generates a UUID)
- ALS context with `{ requestId, path }` for the duration of the request
- Auto-logs request start, completion, and errors via `emit.info` / `emit.error`
- Propagates `x-request-id` header in the response
- Optional `pageview` analytics event on GET requests

```typescript
import { withLogger } from '@emit-io/next'
import type { MiddlewareOptions } from '@emit-io/next'

const options: MiddlewareOptions = {
  logger,
  extractRequestId: (req) => req.headers.get('x-trace-id') ?? undefined,
  trackPageviews: true,   // default: true
}

export default withLogger(myHandler, options)
```

### `instrumentRoute(handler, options)`

Wraps an App Router route handler (`GET`, `POST`, etc.). Adds:
- `requestId` + ALS context with `{ requestId, path, method }`
- Logs completion with `status` and `durationMs`
- Catches errors and logs them before re-throwing

```typescript
import { instrumentRoute } from '@emit-io/next'
import type { RouteHandlerOptions } from '@emit-io/next'

export const POST = instrumentRoute(
  async (req, ctx) => {
    const { id } = await ctx.params
    return Response.json({ id })
  },
  { logger, eventName: 'create-order' }
)
```

## ALS Context in Route Handlers

Both `withLogger` and `instrumentRoute` use `runWithContext` internally. Any log calls made within the handler automatically include `requestId` and other bound fields without manual threading.

```typescript
// Inside a route wrapped with instrumentRoute:
emit.info('processing order', { orderId: '123' })
// → { msg: 'processing order', context: { requestId: 'uuid', path: '/api/orders', method: 'POST', orderId: '123' } }
```

## Peer Dependencies

| Package | Version |
|---|---|
| `@emit-io/core` | `^1.0.0` |
| `next` | `^14.0.0 \|\| ^15.0.0` |

## License

MIT
