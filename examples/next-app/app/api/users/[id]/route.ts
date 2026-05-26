import { NextResponse } from 'next/server'
import { instrumentRoute } from '@movibe/logger-next'
import { logger } from '../../../../lib/logger.js'

interface Params {
  id: string
}

export const GET = instrumentRoute<Params>(
  async (_req, ctx) => {
    const { id } = await ctx.params
    logger.info('fetching user', { userId: id })
    return NextResponse.json({ id, name: 'Demo User' })
  },
  { logger, eventName: 'user-fetched' }
)
