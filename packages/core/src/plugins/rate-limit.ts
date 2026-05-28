import type { LogEntry, Plugin } from '../types.js'

export type RateLimitOptions = {
  max: number
  windowMs: number
  key?: (entry: LogEntry) => string
}

export function rateLimit(opts: RateLimitOptions): Plugin {
  const keyFn = opts.key ?? (() => 'global')
  const buckets = new Map<string, { count: number; resetAt: number }>()

  return (entry) => {
    const now = Date.now()
    const k = keyFn(entry)
    let b = buckets.get(k)
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs }
      buckets.set(k, b)
    }
    if (b.count >= opts.max) return null
    b.count += 1
    return entry
  }
}
