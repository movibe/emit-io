import type { LogLevel, Plugin } from '../types.js'

export type SampleOptions = {
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
