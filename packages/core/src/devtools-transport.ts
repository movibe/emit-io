import type { LogEntry, Transport } from './types.js'
import { LEVEL_LABELS, LogLevel, resolveEnabled } from './types.js'

export type DevToolsTransportOptions = {
  name?: string
  minLevel?: LogLevel
  /** WebSocket URL (default 'ws://localhost:9999') */
  url?: string
  /** Custom WebSocket class (for testing or non-browser environments) */
  WebSocketClass?: typeof WebSocket
  /** Reconnect on close (default true) */
  reconnect?: boolean
  /** Reconnect backoff ms (default 1000, doubles up to 30000) */
  reconnectMs?: number
  /** Max buffer of entries while disconnected (default 100) */
  bufferSize?: number
  /** Callback on connection state change */
  onState?: (state: 'connecting' | 'open' | 'closed' | 'error') => void
  enabled?: boolean
}

export class DevToolsTransport implements Transport {
  readonly name: string
  readonly minLevel: LogLevel
  enabled: boolean
  private url: string
  private WSClass: typeof WebSocket
  private ws: WebSocket | null = null
  private buffer: LogEntry[] = []
  private bufferSize: number
  private reconnect: boolean
  private baseReconnectMs: number
  private currentReconnectMs: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private onState?: DevToolsTransportOptions['onState']
  private closed = false

  constructor(opts?: DevToolsTransportOptions) {
    this.name = opts?.name ?? 'devtools'
    this.minLevel = opts?.minLevel ?? LogLevel.DEBUG
    this.url = opts?.url ?? 'ws://localhost:9999'
    this.WSClass =
      opts && 'WebSocketClass' in opts
        ? (opts.WebSocketClass as typeof WebSocket)
        : (globalThis as any).WebSocket
    this.reconnect = opts?.reconnect ?? true
    this.baseReconnectMs = opts?.reconnectMs ?? 1000
    this.currentReconnectMs = this.baseReconnectMs
    this.bufferSize = opts?.bufferSize ?? 100
    this.onState = opts?.onState
    this.enabled = resolveEnabled(opts)

    if (!this.WSClass) {
      console.warn('[DevToolsTransport] WebSocket not available; entries will buffer only')
      return
    }
    this.connect()
  }

  private connect(): void {
    if (this.closed) return
    this.onState?.('connecting')
    try {
      this.ws = new this.WSClass(this.url)
    } catch (_err) {
      this.onState?.('error')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.onState?.('open')
      this.currentReconnectMs = this.baseReconnectMs
      this.drainBuffer()
    }

    this.ws.onclose = () => {
      this.onState?.('closed')
      this.ws = null
      if (this.reconnect && !this.closed) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.onState?.('error')
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.currentReconnectMs = Math.min(this.currentReconnectMs * 2, 30_000)
      this.connect()
    }, this.currentReconnectMs)
  }

  private drainBuffer(): void {
    while (this.buffer.length > 0 && this.ws && this.ws.readyState === 1) {
      const entry = this.buffer.shift()!
      this.send(entry)
    }
  }

  private send(entry: LogEntry): void {
    if (this.ws?.readyState !== 1) {
      this.enqueue(entry)
      return
    }
    try {
      this.ws.send(JSON.stringify(serializeEntry(entry)))
    } catch {
      this.enqueue(entry)
    }
  }

  private enqueue(entry: LogEntry): void {
    if (this.buffer.length >= this.bufferSize) {
      this.buffer.shift() // drop oldest
    }
    this.buffer.push(entry)
  }

  log(entry: LogEntry): void {
    this.send(entry)
  }

  async close(): Promise<void> {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  flush(): void {
    this.drainBuffer()
  }
}

function serializeEntry(entry: LogEntry): Record<string, unknown> {
  return {
    level: LEVEL_LABELS[entry.level] ?? 'UNKNOWN',
    levelNum: entry.level,
    msg: entry.message,
    time: entry.timestamp.toISOString(),
    context: entry.context && Object.keys(entry.context).length > 0 ? entry.context : undefined,
    error: entry.error
      ? {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        }
      : undefined,
  }
}
