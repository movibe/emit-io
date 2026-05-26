import { NextResponse } from 'next/server'
import { instrumentRoute } from '@emit/next'
import { logger } from '../../../lib/logger.js'

export const GET = instrumentRoute(
  async () => {
    return NextResponse.json({ ok: true, ts: Date.now() })
  },
  { logger, eventName: 'health-checked' }
)
