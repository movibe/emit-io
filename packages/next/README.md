# @emit/next

Next.js bindings for [@emit/core](https://github.com/Emit-logger/emit) — middleware logging and App Router route handler instrumentation.

## Install

```bash
npm install @emit/core @emit/next
```

## Quick Start

```typescript
// lib/logger.ts
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emit/core'

export const logger = new LoggerStrategy({
  transports: [new JSONTransport({ minLevel: LogLevelEnum.INFO })],
})
```

```typescript
// middleware.ts
import { withLogger } from '@emit/next'
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
import { instrumentRoute } from '@emit/next'
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
- Auto-logs request start, completion, and errors via `logger.info` / `logger.error`
- Propagates `x-request-id` header in the response
- Optional `pageview` analytics event on GET requests

```typescript
import { withLogger } from '@emit/next'
import type { MiddlewareOptions } from '@emit/next'

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
import { instrumentRoute } from '@emit/next'
import type { RouteHandlerOptions } from '@emit/next'

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
logger.info('processing order', { orderId: '123' })
// → { msg: 'processing order', context: { requestId: 'uuid', path: '/api/orders', method: 'POST', orderId: '123' } }
```

## Peer Dependencies

| Package | Version |
|---|---|
| `@emit/core` | `^1.0.0` |
| `next` | `^14.0.0 \|\| ^15.0.0` |

## License

MIT
