# hono-worker example

Cloudflare Worker example using [Hono](https://hono.dev) and `@emitio/hono`.

The Worker:

- Builds a `LoggerStrategy` per request with an `HTTPTransport` that POSTs
  batched log entries to a remote ingest endpoint.
- Uses `loggerMiddleware` from `@emitio/hono` to attach a request-scoped
  child logger (with `requestId`, `method`, `path`) to every Hono context.
- Defers the final batch flush with
  `c.executionCtx.waitUntil(logger.close())` so the response returns
  immediately while pending log batches finish in the background.

## Routes

- `GET /` — minimal hello response, logs `hello-handler`.
- `GET /api/data` — returns a static list, logs `fetching-data`.
- `POST /api/event` — accepts JSON `{ name, ...properties }` and calls
  `logger.event(name, body)` plus `logger.info('event-received')`.

## Run locally

```bash
# from the repo root
npm install

# from this folder
cd examples/hono-worker
npm run dev
```

Wrangler dev will serve the Worker on `http://localhost:8787`.

Try it:

```bash
curl http://localhost:8787/
curl http://localhost:8787/api/data
curl -X POST http://localhost:8787/api/event \
  -H 'content-type: application/json' \
  -d '{"name":"checkout-started","cartId":"cart_123"}'
```

## Configuration

`wrangler.toml` defines two vars used by the HTTP transport:

| Variable | Description |
| --- | --- |
| `LOG_INGEST_URL` | URL the Worker POSTs batched log entries to. Replace the placeholder with your real ingest endpoint. |
| `LOG_INGEST_TOKEN` | Bearer token sent as `authorization: Bearer <token>`. |

For production, prefer `wrangler secret put LOG_INGEST_TOKEN` over committing
the token to `wrangler.toml`.

## Notes

- Targets the Cloudflare Workers runtime (edge). No Node-only APIs are used at
  runtime — `HTTPTransport` relies on `globalThis.fetch`, `setInterval`, and
  `AbortController`, all available on Workers.
- `nodejs_compat` is enabled in `wrangler.toml` only to keep TypeScript types
  permissive across `@emitio/core`'s shared core; runtime code paths used
  here do not require it.
- Each request constructs its own logger so that `waitUntil(logger.close())`
  has a well-defined lifecycle. For higher throughput you can hoist the logger
  to module scope and call `logger.flush()` (instead of `close()`) inside
  `waitUntil`.
