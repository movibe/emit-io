import type { LogEntry, Transport, AnalyticsProvider } from './types.js'
import { LogLevel } from './types.js'

const RESET = '\x1b[0m'
const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[90m',
  [LogLevel.INFO]:  '\x1b[34m',
  [LogLevel.WARN]:  '\x1b[33m',
  [LogLevel.ERROR]: '\x1b[31m',
  [LogLevel.FATAL]: '\x1b[41;97m',
}
const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]:  'INFO',
  [LogLevel.WARN]:  'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

function formatEntry(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level]
  const label = LEVEL_LABELS[entry.level]
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
  const err = entry.error ? `\n  ${entry.error.stack ?? entry.error.message}` : ''
  return `${entry.timestamp.toISOString()} ${color}${label}${RESET} ${entry.message}${ctx}${err}`
}

export interface ConsoleTransportOptions {
  name?: string
  minLevel?: LogLevel
  pretty?: boolean
}

export class ConsoleTransport implements Transport {
  readonly name: string
  readonly minLevel: LogLevel
  private pretty: boolean

  constructor(options?: ConsoleTransportOptions) {
    this.name = options?.name ?? 'console'
    this.minLevel = options?.minLevel ?? LogLevel.DEBUG
    this.pretty = options?.pretty ?? true
  }

  log(entry: LogEntry): void {
    const formatted = this.pretty ? formatEntry(entry) : `${entry.timestamp} [${LEVEL_LABELS[entry.level]}] ${entry.message}`
    const fn = entry.level >= LogLevel.ERROR ? console.error
      : entry.level === LogLevel.WARN ? console.warn
      : console.log
    fn(formatted)
  }

  flush(): void {}
}

export interface ConsoleProviderOptions {
  name?: string
  enabled?: boolean
}

export class ConsoleProvider implements AnalyticsProvider {
  readonly name: string
  readonly enabled: boolean

  constructor(options?: ConsoleProviderOptions) {
    this.name = options?.name ?? 'console-analytics'
    this.enabled = options?.enabled ?? true
  }

  init(): void {
    console.log(`[${this.name}] initialized`)
  }

  event(name: string, properties?: Record<string, any>): void {
    console.log(`[${this.name}] event: ${name}`, properties ?? '')
  }

  identify(user: { id: string; [key: string]: any }): void {
    console.log(`[${this.name}] identify:`, user.id, user)
  }

  screen(name: string, params?: Record<string, any>): void {
    console.log(`[${this.name}] screen: ${name}`, params ?? '')
  }

  error(feature: string, name: string, critical: boolean, error: Error, extra?: Record<string, unknown>): void {
    console.error(`[${this.name}] error: [${feature}] ${name} (critical: ${critical})`, error, extra ?? '')
  }

  flush(): void {}
  reset(): void {}
}
