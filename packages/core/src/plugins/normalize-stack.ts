import type { LogEntry, Plugin } from '../types.js'

export type StackFrame = {
  function?: string
  file?: string
  line?: number
  col?: number
  raw: string
}

export type NormalizeStackOptions = {
  /** Read stack from entry.error.stack (default true) */
  fromError?: boolean
  /** Read stack from entry.context.stack (default true) */
  fromContext?: boolean
  /** Limit number of frames */
  maxFrames?: number
}

export function normalizeStack(opts?: NormalizeStackOptions): Plugin {
  const fromError = opts?.fromError ?? true
  const fromContext = opts?.fromContext ?? true
  const maxFrames = opts?.maxFrames

  return (entry) => {
    const stack = (fromError && entry.error?.stack)
      || (fromContext && typeof entry.context?.stack === 'string' ? entry.context.stack : undefined)
    if (!stack) return entry

    const frames = parseStack(stack)
    const limited = maxFrames ? frames.slice(0, maxFrames) : frames

    return {
      ...entry,
      context: { ...entry.context, stackFrames: limited },
    }
  }
}

const V8_RE = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/
const WEBKIT_RE = /^(.*?)@(.+?):(\d+):(\d+)$/

function parseStack(stack: string): StackFrame[] {
  const lines = stack.split('\n').slice(1) // skip first line (error message)
  const frames: StackFrame[] = []
  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    let match = V8_RE.exec(trimmed)
    if (match) {
      frames.push({
        function: match[1] || undefined,
        file: match[2],
        line: Number(match[3]),
        col: Number(match[4]),
        raw,
      })
      continue
    }
    match = WEBKIT_RE.exec(trimmed)
    if (match) {
      frames.push({
        function: match[1] || undefined,
        file: match[2],
        line: Number(match[3]),
        col: Number(match[4]),
        raw,
      })
      continue
    }
    frames.push({ raw })
  }
  return frames
}
