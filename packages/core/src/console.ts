import type { LogEntry, Transport, AnalyticsProvider } from './types.js'
import { LogLevel } from './types.js'

const D='\x1b[90m',I='\x1b[34m',W='\x1b[33m',E='\x1b[31m',F='\x1b[41;97m',R='\x1b[0m'
const L=['DEBUG','INFO','WARN','ERROR','FATAL']
const C=[D,I,W,E,F]
function formatEntry(entry: LogEntry): string {
  const ctx=entry.context?` ${JSON.stringify(entry.context)}`:''
  const err=entry.error?`\n  ${entry.error.stack??entry.error.message}`:''
  return `${entry.timestamp.toISOString()} ${C[entry.level]}${L[entry.level]}${R} ${entry.message}${ctx}${err}`
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
    const formatted = this.pretty ? formatEntry(entry) : `${entry.timestamp} [${L[entry.level]}] ${entry.message}`
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
