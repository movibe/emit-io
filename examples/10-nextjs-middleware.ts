// middleware.ts — placed at the root of your Next.js project
import { NextResponse } from 'next/server'
import { withLogger } from '@emitio/next'
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emitio/core'

const logger = new LoggerStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

// withLogger wraps your middleware function, attaches a child logger with
// request context (method, path, requestId), and optionally tracks pageviews.
export const middleware = withLogger(
  async (req, event) => {
    // req.log_ is the child logger — already has method, path, requestId bound
    return NextResponse.next()
  },
  {
    logger,
    trackPageviews: true,
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
