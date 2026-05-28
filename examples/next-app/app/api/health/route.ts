import { NextResponse } from 'next/server'
import { instrumentRoute } from 'emit-io-next'
import { logger } from '../../../lib/emit.js'

export const GET = instrumentRoute(
  async () => {
    return NextResponse.json({ ok: true, ts: Date.now() })
  },
  { logger, eventName: 'health-checked' }
)
