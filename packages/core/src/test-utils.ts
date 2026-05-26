import type { LogEntry, Transport, AnalyticsProvider } from './types.js'
import { LogLevel } from './types.js'
import { LoggerStrategy } from './index.js'

export interface MockTransport extends Transport {
  readonly entries: LogEntry[]
  readonly flushCalls: number
  clear(): void
}

export interface MockProvider extends AnalyticsProvider {
  readonly events: Array<{ name: string; properties: unknown }>
  readonly identifies: Array<unknown>
  readonly screens: Array<{ name: string; params?: unknown }>
  readonly errors: Array<{ feature: string; name: string; critical: boolean; error: Error; extra?: unknown }>
  readonly initCalls: number
  readonly flushCalls: number
  readonly resetCalls: number
  clear(): void
}

export function createMockTransport(options?: { name?: string; minLevel?: LogLevel }): MockTransport {
  const _entries: LogEntry[] = []
  let _flushCalls = 0

  const transport: MockTransport = {
    get name() { return options?.name ?? 'mock-transport' },
    get minLevel() { return options?.minLevel ?? LogLevel.DEBUG },
    get entries() { return _entries },
    get flushCalls() { return _flushCalls },
    log(entry: LogEntry): void {
      _entries.push(entry)
    },
    flush(): void {
      _flushCalls++
    },
    clear(): void {
      _entries.length = 0
      _flushCalls = 0
    },
  }

  return transport
}

export function createMockProvider(options?: { name?: string; enabled?: boolean }): MockProvider {
  const _events: Array<{ name: string; properties: unknown }> = []
  const _identifies: Array<unknown> = []
  const _screens: Array<{ name: string; params?: unknown }> = []
  const _errors: Array<{ feature: string; name: string; critical: boolean; error: Error; extra?: unknown }> = []
  let _initCalls = 0
  let _flushCalls = 0
  let _resetCalls = 0

  const provider: MockProvider = {
    get name() { return options?.name ?? 'mock-provider' },
    enabled: options?.enabled ?? true,
    get events() { return _events },
    get identifies() { return _identifies },
    get screens() { return _screens },
    get errors() { return _errors },
    get initCalls() { return _initCalls },
    get flushCalls() { return _flushCalls },
    get resetCalls() { return _resetCalls },
    init(): void {
      _initCalls++
    },
    event(name: string, properties?: unknown): void {
      _events.push({ name, properties })
    },
    identify(user: unknown): void {
      _identifies.push(user)
    },
    screen(name: string, params?: unknown): void {
      _screens.push({ name, params })
    },
    error(feature: string, name: string, critical: boolean, error: Error, extra?: unknown): void {
      _errors.push({ feature, name, critical, error, extra })
    },
    flush(): void {
      _flushCalls++
    },
    reset(): void {
      _resetCalls++
    },
    clear(): void {
      _events.length = 0
      _identifies.length = 0
      _screens.length = 0
      _errors.length = 0
      _initCalls = 0
      _flushCalls = 0
      _resetCalls = 0
    },
  }

  return provider
}

export function createTestLogger(): { logger: LoggerStrategy; transport: MockTransport; provider: MockProvider } {
  const transport = createMockTransport()
  const provider = createMockProvider()
  const logger = new LoggerStrategy({
    transports: [transport],
    providers: [provider],
    emitAppOpenOnInit: false,
  })
  return { logger, transport, provider }
}
