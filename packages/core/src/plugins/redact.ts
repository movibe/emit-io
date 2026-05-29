import type { Plugin } from '../types.js'

export type RedactOptions = {
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
    // Copy-on-write (COW): start with a shallow copy of context, then for each
    // redact path clone only the minimal chain of objects needed to reach the
    // target key. Objects/arrays NOT on a redact path are never cloned, making
    // this O(depth * path_count) instead of O(total_keys).
    let context: Record<string, unknown> = { ...entry.context }
    for (const path of compiled) {
      context = applyPathCow(context, path.segments, 0, censor, remove)
    }
    return { ...entry, context }
  }
}

/**
 * Recursively applies copy-on-write along `segments` starting at index `i`.
 * Returns a new object with only the affected branch shallow-copied; all
 * sibling subtrees are shared with the original.
 */
function applyPathCow(
  obj: any,
  segments: string[],
  i: number,
  censor: string,
  remove: boolean,
): any {
  if (i >= segments.length || obj == null || typeof obj !== 'object') return obj
  const seg = segments[i]
  const isLast = i === segments.length - 1

  if (seg === '*') {
    // Wildcard: iterate all keys; shallow-copy obj once, then process each key.
    const copy: Record<string, unknown> = { ...obj }
    for (const k of Object.keys(copy)) {
      if (isLast) {
        if (remove) delete copy[k]
        else copy[k] = censor
      } else {
        copy[k] = applyPathCow(copy[k], segments, i + 1, censor, remove)
      }
    }
    return copy
  } else {
    if (!(seg in obj)) return obj
    if (isLast) {
      // Shallow-copy obj and mutate only the target key.
      const copy: Record<string, unknown> = { ...obj }
      if (remove) delete copy[seg]
      else copy[seg] = censor
      return copy
    } else {
      // Shallow-copy obj and recurse into the child branch.
      const copy: Record<string, unknown> = { ...obj }
      copy[seg] = applyPathCow(copy[seg], segments, i + 1, censor, remove)
      return copy
    }
  }
}
