import { NextResponse } from 'next/server'
import { instrumentRoute } from 'emit-io-next'
import { logger } from '../../../../lib/emit.js'

interface Params {
  id: string
}

export const GET = instrumentRoute<Params>(
  async (_req, ctx) => {
    const { id } = await ctx.params
    emit.info('fetching user', { userId: id })
    return NextResponse.json({ id, name: 'Demo User' })
  },
  { logger, eventName: 'user-fetched' }
)
