import { NextResponse } from 'next/server'
import { withLogger } from '@movibe/logger-next'
import { logger } from './lib/logger.js'

export const middleware = withLogger(
  async (_req) => {
    return NextResponse.next()
  },
  { logger, trackPageviews: true }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
