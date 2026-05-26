import { type NextRequest } from 'next/server'
import { runWithContext, type LoggerStrategy } from '@movibe/logger'

export interface RouteHandlerOptions {
  logger: LoggerStrategy
  eventName?: string
}

export type RouteHandler<TParams = unknown> = (
  req: NextRequest,
  ctx: { params: Promise<TParams> }
) => Promise<Response> | Response

export function instrumentRoute<TParams>(
  handler: RouteHandler<TParams>,
  options: RouteHandlerOptions
): RouteHandler<TParams> {
  return async (req, ctx) => {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
    return runWithContext({ requestId, path: req.nextUrl.pathname, method: req.method }, async () => {
      const start = Date.now()
      try {
        const res = await handler(req, ctx)
        options.logger.info(options.eventName ?? 'route-handled', {
          status: res.status,
          durationMs: Date.now() - start,
        })
        return res
      } catch (err) {
        options.logger.error('route-failed', {
          durationMs: Date.now() - start,
          error: (err as Error).message,
        })
        throw err
      }
    })
  }
}
