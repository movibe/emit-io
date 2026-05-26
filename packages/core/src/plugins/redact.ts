import type { LogEntry, Plugin } from '../types.js'

export interface RedactOptions {
  paths: string[]
  censor?: string
  remove?: boolean
}

export function redact(opts: RedactOptions): Plugin {
  const censor = opts.censor ?? '[REDACTED]'
  const remove = opts.remove ?? false
  const compiled = opts.paths.map((p) => ({
    segments: p.split('.'),
    hasWildcard: p.includes('*'),
  }))

  return (entry) => {
    if (!entry.context) return entry
    const cloned = deepClone(entry.context)
    for (const path of compiled) {
      applyPath(cloned, path.segments, 0, censor, remove)
    }
    return { ...entry, context: cloned }
  }
}

function deepClone(obj: Record<string, unknown>): Record<string, unknown> {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

function applyPath(
  obj: any,
  segments: string[],
  i: number,
  censor: string,
  remove: boolean
): void {
  if (i >= segments.length || obj == null) return
  const seg = segments[i]
  const isLast = i === segments.length - 1
  if (seg === '*') {
    if (typeof obj !== 'object') return
    for (const k of Object.keys(obj)) {
      if (isLast) {
        if (remove) delete obj[k]
        else obj[k] = censor
      } else {
        applyPath(obj[k], segments, i + 1, censor, remove)
      }
    }
  } else {
    if (typeof obj !== 'object' || !(seg in obj)) return
    if (isLast) {
      if (remove) delete obj[seg]
      else obj[seg] = censor
    } else {
      applyPath(obj[seg], segments, i + 1, censor, remove)
    }
  }
}
