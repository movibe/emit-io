// JSONTransport — emits one NDJSON line per LogEntry.
//
// NOTE: This transport does NOT filter by minLevel in log().
// Filtering is the responsibility of the upstream emitToTransports
// in LoggerStrategy (which compares entry.level >= transport.minLevel).
// This matches the behaviour of ConsoleTransport.

import type { LogEntry, Transport } from './types.js'
import { LogLevel } from './types.js'

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

const defaultWrite: (line: string) => void =
  typeof process !== 'undefined' && process.stdout
    ? (line: string) => process.stdout.write(line)
    : (line: string) => console.log(line.trimEnd())

export interface JSONTransportOptions {
  name?: string
  minLevel?: LogLevel
  write?: (line: string) => void
  serializer?: (entry: LogEntry) => Record<string, unknown>
}

export class JSONTransport implements Transport {
  readonly name: string
  readonly minLevel: LogLevel
  private write: (line: string) => void
  private serializer?: (entry: LogEntry) => Record<string, unknown>

  constructor(options?: JSONTransportOptions) {
    this.name = options?.name ?? 'json'
    this.minLevel = options?.minLevel ?? LogLevel.DEBUG
    this.write = options?.write ?? defaultWrite
    this.serializer = options?.serializer
  }

  log(entry: LogEntry): void {
    let obj: Record<string, unknown>

    if (this.serializer) {
      try {
        obj = this.serializer(entry)
      } catch {
        obj = this.buildDefault(entry)
      }
    } else {
      obj = this.buildDefault(entry)
    }

    let line: string
    try {
      line = JSON.stringify(obj) + '\n'
    } catch {
      // Circular reference or other stringify error — write fallback
      const fallback: Record<string, unknown> = {
        level: 'ERROR',
        msg: 'serialize failed',
        time: new Date().toISOString(),
        originalLevel: LEVEL_LABELS[entry.level],
        originalMsg: entry.message,
      }
      try {
        line = JSON.stringify(fallback) + '\n'
      } catch {
        line = '{"level":"ERROR","msg":"serialize failed"}\n'
      }
    }

    this.write(line)
  }

  flush(): void {}

  private buildDefault(entry: LogEntry): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      level: LEVEL_LABELS[entry.level],
      msg: entry.message,
      time: entry.timestamp.toISOString(),
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      obj.context = entry.context
    }

    if (entry.error) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      }
    }

    return obj
  }
}
