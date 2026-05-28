// HTTPTransport — batches LogEntries and POSTs them via fetch.
//
// Behaviour:
//   - log(entry) enqueues; does NOT send immediately.
//   - Flushes when buffer.length >= batchSize OR flushIntervalMs elapses.
//   - flush() drains the current buffer immediately (awaitable).
//   - Retry: exponential backoff (retryBackoffMs * 2^attempt).
//   - After maxRetries: drop batch + console.error (never throws).
//   - Timer is lazy (started on first log()), unref'd in Node, cleared in close().
//   - close(): flush remaining entries then clear the timer.

import type { LogEntry, Transport } from './types.js'
import { LogLevel } from './types.js'

export interface HTTPTransportOptions {
  url: string
  name?: string
  minLevel?: LogLevel
  batchSize?: number
  flushIntervalMs?: number
  maxRetries?: number
  retryBackoffMs?: number
  headers?: Record<string, string>
  timeoutMs?: number
  serializer?: (entries: LogEntry[]) => string
  fetch?: typeof fetch
  onError?: (err: Error, entries: LogEntry[]) => void
  enabled?: boolean
}

export class HTTPTransport implements Transport {
  readonly name: string
  readonly minLevel: LogLevel
  enabled: boolean

  private readonly url: string
  private readonly batchSize: number
  private readonly flushIntervalMs: number
  private readonly maxRetries: number
  private readonly retryBackoffMs: number
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number
  private readonly serializer: (entries: LogEntry[]) => string
  private readonly fetchFn: typeof fetch
  private readonly onError?: (err: Error, entries: LogEntry[]) => void

  private buffer: LogEntry[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  // inflight tracks any ongoing sendWithRetry so flush/close can await it
  private inflight: Promise<void> | null = null
  private closed = false

  constructor(options: HTTPTransportOptions) {
    this.name = options.name ?? 'http'
    this.minLevel = options.minLevel ?? LogLevel.DEBUG
    this.url = options.url
    this.batchSize = options.batchSize ?? 50
    this.flushIntervalMs = options.flushIntervalMs ?? 5000
    this.maxRetries = options.maxRetries ?? 3
    this.retryBackoffMs = options.retryBackoffMs ?? 1000
    this.headers = options.headers ?? {}
    this.timeoutMs = options.timeoutMs ?? 10000
    this.serializer = options.serializer ?? ((entries) => JSON.stringify({ entries }))
    this.fetchFn = options.fetch ?? globalThis.fetch
    this.onError = options.onError
    this.enabled = options.enabled ?? true
  }

  log(entry: LogEntry): void {
    if (this.closed) return
    // Safety net: skip if below minLevel (primary filtering is upstream)
    if (entry.level < this.minLevel) return

    this.buffer.push(entry)

    // Start lazy timer on first log
    if (this.timer === null) {
      this.timer = setInterval(() => {
        if (this.buffer.length > 0) {
          this.scheduleFlush()
        }
      }, this.flushIntervalMs)
      // unref so this timer doesn't keep Node.js alive
      if (typeof this.timer === 'object' && this.timer !== null && 'unref' in this.timer) {
        (this.timer as { unref(): void }).unref()
      }
    }

    // Size-based flush
    if (this.buffer.length >= this.batchSize) {
      this.scheduleFlush()
    }
  }

  private scheduleFlush(): void {
    // Snapshot buffer immediately to avoid race conditions with concurrent log()
    const batch = this.buffer
    this.buffer = []

    if (batch.length === 0) return

    // Chain onto any inflight send so we don't fire two concurrent retries
    const send = (): Promise<void> => this.sendWithRetry(batch)

    let p: Promise<void>
    if (this.inflight !== null) {
      // Wait for the current inflight to settle (success or drop) then send ours
      p = this.inflight.then(send, send)
    } else {
      p = send()
    }

    this.inflight = p

    // Only clear inflight if it still points to this promise (i.e. no subsequent
    // batch has replaced it with a new chain). This prevents a second scheduleFlush
    // from appearing to be done when the first send resolves.
    p.then(() => {
      if (this.inflight === p) this.inflight = null
    }, () => {
      if (this.inflight === p) this.inflight = null
    })
  }

  async flush(): Promise<void> {
    // Wait for any inflight first
    if (this.inflight !== null) {
      await this.inflight
    }

    const batch = this.buffer
    this.buffer = []

    if (batch.length === 0) return

    await this.sendWithRetry(batch)
  }

  async close(): Promise<void> {
    this.closed = true

    // Clear interval timer
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }

    // Final flush
    await this.flush()
  }

  private async sendWithRetry(batch: LogEntry[], attempt = 0): Promise<void> {
    try {
      const ctrl = new AbortController()
      const timeoutId = setTimeout(() => ctrl.abort(), this.timeoutMs)

      let res: Response
      try {
        res = await this.fetchFn(this.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...this.headers,
          },
          body: this.serializer(batch),
          signal: ctrl.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      if (attempt >= this.maxRetries) {
        const error = err instanceof Error ? err : new Error(String(err))
        this.onError?.(error, batch)
        console.error(
          `[HTTPTransport] dropped ${batch.length} entries after ${attempt} retries:`,
          error,
        )
        return
      }

      const delay = this.retryBackoffMs * 2 ** attempt
      await new Promise<void>((r) => setTimeout(r, delay))
      return this.sendWithRetry(batch, attempt + 1)
    }
  }
}
