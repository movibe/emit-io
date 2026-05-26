import type { LogEntry, Plugin } from '../types.js'
import { LogLevel } from '../types.js'

export interface SampleOptions {
  rate: number
  levels?: LogLevel[]
  random?: () => number
}

export function sample(opts: SampleOptions): Plugin {
  const random = opts.random ?? Math.random
  const levels = opts.levels
  return (entry) => {
    if (levels && !levels.includes(entry.level)) return entry
    return random() < opts.rate ? entry : null
  }
}
