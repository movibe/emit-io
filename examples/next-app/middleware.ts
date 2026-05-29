import { NextResponse } from 'next/server'
import { withLogger } from 'emit-io-next'
import { emit } from './lib/logger.js'

export const middleware = withLogger(
  async (_req) => {
    return NextResponse.next()
  },
  { logger: emit, trackPageviews: true }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
