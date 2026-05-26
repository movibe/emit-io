import { NextResponse, type NextRequest } from 'next/server'
import { runWithContext, type LoggerStrategy } from '@movibe/logger'

export interface MiddlewareOptions {
  logger: LoggerStrategy
  extractRequestId?: (req: NextRequest) => string
  /** Auto-emit pageview event on GET (default true) */
  trackPageviews?: boolean
}

export function withLogger(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: MiddlewareOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = options.extractRequestId?.(req)
      ?? req.headers.get('x-request-id')
      ?? crypto.randomUUID()

    return runWithContext({ requestId, path: req.nextUrl.pathname }, async () => {
      const start = Date.now()
      try {
        const res = await handler(req)
        options.logger.info('request', {
          method: req.method,
          path: req.nextUrl.pathname,
          status: res.status,
          durationMs: Date.now() - start,
        })
        if (options.trackPageviews !== false && req.method === 'GET') {
          options.logger.event('pageview' as any, { path: req.nextUrl.pathname })
        }
        // Propagate requestId
        res.headers.set('x-request-id', requestId)
        return res
      } catch (err) {
        options.logger.error('request-failed', {
          method: req.method,
          path: req.nextUrl.pathname,
          durationMs: Date.now() - start,
          error: (err as Error).message,
        })
        throw err
      }
    })
  }
}
