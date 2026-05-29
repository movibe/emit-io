import { NextResponse } from 'next/server'
import { instrumentRoute } from 'emit-io-next'
import { emit } from '../../../lib/logger.js'

export const GET = instrumentRoute(
  async () => {
    return NextResponse.json({ ok: true, ts: Date.now() })
  },
  { logger: emit, eventName: 'health-checked' }
)
