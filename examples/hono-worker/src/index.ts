/**
 * Cloudflare Worker example using Hono + @movibe/logger-hono.
 *
 * - LoggerStrategy with HTTPTransport ships log batches to a remote ingest URL.
 * - loggerMiddleware attaches a request-scoped child logger to each request.
 * - executionCtx.waitUntil(logger.close()) lets the Worker finish flushing
 *   buffered log batches after returning the response.
 */

import { Hono } from 'hono'
import {
  LoggerStrategy,
  HTTPTransport,
  LogLevelEnum,
} from '@movibe/logger'
import { loggerMiddleware } from '@movibe/logger-hono'

export interface Env {
  LOG_INGEST_URL: string
  LOG_INGEST_TOKEN: string
}

type Variables = {
  logger: LoggerStrategy
  requestId: string
}

function buildLogger(env: Env): LoggerStrategy {
  return new LoggerStrategy({
    transports: [
      new HTTPTransport({
        url: env.LOG_INGEST_URL,
        minLevel: LogLevelEnum.INFO,
        batchSize: 25,
        flushIntervalMs: 2000,
        maxRetries: 2,
        retryBackoffMs: 250,
        timeoutMs: 5000,
        headers: {
          authorization: `Bearer ${env.LOG_INGEST_TOKEN}`,
        },
      }),
    ],
  })
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Build & attach a per-request logger middleware. We rebuild the logger
// per Worker invocation so each isolate-bound batch is bounded by waitUntil.
app.use('*', async (c, next) => {
  const logger = buildLogger(c.env)
  // Inject middleware on the fly so it has the current logger instance.
  const handler = loggerMiddleware({ logger })
  await handler(c, async () => {
    await next()
    // Schedule flush after the response is sent.
    c.executionCtx.waitUntil(logger.close())
  })
})

app.get('/', (c) => {
  const log = c.get('logger')
  log.info('hello-handler')
  return c.json({
    ok: true,
    message: 'Hello from Hono on Cloudflare Workers with @movibe/logger',
    requestId: c.get('requestId'),
  })
})

app.get('/api/data', (c) => {
  const log = c.get('logger')
  log.info('fetching-data', { source: 'static-fixture' })
  return c.json({
    items: [
      { id: 1, name: 'alpha' },
      { id: 2, name: 'beta' },
      { id: 3, name: 'gamma' },
    ],
  })
})

app.post('/api/event', async (c) => {
  const log = c.get('logger')
  let body: Record<string, unknown> = {}
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    log.info('event-body-parse-failed')
    return c.json({ ok: false, error: 'invalid-json' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name : 'custom-event'
  log.event(name as never, body as never)
  log.info('event-received', { name })

  return c.json({ ok: true, name })
})

export default app
