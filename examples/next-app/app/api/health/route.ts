import { NextResponse } from 'next/server'
import { instrumentRoute } from '@movibe/logger-next'
import { logger } from '../../../lib/logger.js'

export const GET = instrumentRoute(
  async () => {
    return NextResponse.json({ ok: true, ts: Date.now() })
  },
  { logger, eventName: 'health-checked' }
)
