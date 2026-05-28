import type { MiddlewareHandler } from 'hono'
import { runWithContext, type EmitIoStrategy } from 'emit-io-core'

export interface LoggerMiddlewareOptions {
  logger: EmitIoStrategy
  /** Header name for request id (default 'x-request-id') */
  requestIdHeader?: string
  /** Auto log request start/end (default true) */
  autoLog?: boolean
  /** Variable name in Hono context.set/get (default 'logger') */
  contextKey?: string
}

export function loggerMiddleware(opts: LoggerMiddlewareOptions): MiddlewareHandler {
  const headerName = opts.requestIdHeader ?? 'x-request-id'
  const autoLog = opts.autoLog ?? true
  const contextKey = opts.contextKey ?? 'logger'
  const baseLogger = opts.logger

  return async (c, next) => {
    const requestId = c.req.header(headerName) ?? crypto.randomUUID()
    const childLogger = baseLogger.child({
      requestId,
      method: c.req.method,
      path: c.req.path,
    })

    c.set(contextKey as any, childLogger)
    c.set('requestId' as any, requestId)
    c.header(headerName, requestId)

    const start = Date.now()

    if (autoLog) {
      childLogger.info('request-start', { method: c.req.method, path: c.req.path })
    }

    try {
      await runWithContext({ requestId, path: c.req.path, method: c.req.method }, async () => {
        await next()
      })
      if (autoLog) {
        childLogger.info('request-complete', {
          status: c.res.status,
          durationMs: Date.now() - start,
        })
      }
    } catch (err) {
      childLogger.error('request-failed', {
        status: c.res?.status ?? 500,
        durationMs: Date.now() - start,
        error: (err as Error).message,
      })
      throw err
    }
  }
}
