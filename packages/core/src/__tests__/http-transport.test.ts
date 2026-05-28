import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import { HTTPTransport } from '../http-transport.js'
import { LogLevel } from '../types.js'
import type { LogEntry } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(msg = 'test', level = LogLevel.INFO): LogEntry {
  return { level, message: msg, timestamp: new Date() }
}

function makeOkFetch(times = Infinity): ReturnType<typeof vi.fn> {
  let count = 0
  return vi.fn(() => {
    count++
    if (count > times) return Promise.reject(new Error('unexpected call'))
    return Promise.resolve(new Response('ok', { status: 200 }))
  })
}

function makeFailFetch(status = 500): ReturnType<typeof vi.fn> {
  return vi.fn(() =>
    Promise.resolve(new Response('error', { status })),
  )
}

// ---------------------------------------------------------------------------
// Batch-size flushing
// ---------------------------------------------------------------------------

describe('batch size flush', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('sends POST when buffer reaches batchSize', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 3,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('a'))
    transport.log(makeEntry('b'))
    // Third log triggers flush
    transport.log(makeEntry('c'))

    // Use flush() to await the inflight send that was triggered by batchSize
    await transport.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.entries).toHaveLength(3)
    expect(body.entries.map((e: LogEntry) => e.message)).toEqual(['a', 'b', 'c'])

    await transport.close()
  })

  test('POST body contains correct log entries', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 2,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('msg-1', LogLevel.WARN))
    transport.log(makeEntry('msg-2', LogLevel.ERROR))

    // batchSize=2, so both entries trigger an immediate size-based flush
    await transport.flush()

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.entries[0].message).toBe('msg-1')
    expect(body.entries[1].message).toBe('msg-2')

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Timer-based flushing
// ---------------------------------------------------------------------------

describe('flushIntervalMs trigger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('sends after interval even without reaching batchSize', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 5_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('only-one'))

    // Advance past the flush interval
    await vi.advanceTimersByTimeAsync(5_001)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.entries).toHaveLength(1)

    await transport.close()
  })

  test('does not send if buffer is empty when timer fires', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 5_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    // Log and immediately flush manually so buffer is empty
    transport.log(makeEntry('one'))
    await transport.flush()

    // Advance timer — no new entries, so no fetch
    await vi.advanceTimersByTimeAsync(5_001)

    // Only the manual flush's fetch call
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// flush() explicit
// ---------------------------------------------------------------------------

describe('flush()', () => {
  test('sends buffer immediately', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('hello'))
    await transport.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    await transport.close()
  })

  test('empty buffer flush does not call fetch', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    await transport.flush()
    expect(fetchMock).not.toHaveBeenCalled()
    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// close()
// ---------------------------------------------------------------------------

describe('close()', () => {
  test('flushes remaining entries before closing', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('last'))
    await transport.close()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.entries[0].message).toBe('last')
  })

  test('close with empty buffer does not send', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 100,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    await transport.close()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('logs after close() are ignored', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    await transport.close()
    transport.log(makeEntry('after-close'))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Retry on HTTP error status
// ---------------------------------------------------------------------------

describe('retry on HTTP error', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('retries on 429 status and succeeds eventually', async () => {
    let calls = 0
    const fetchMock = vi.fn(() => {
      calls++
      if (calls <= 1) {
        return Promise.resolve(new Response('rate limited', { status: 429 }))
      }
      return Promise.resolve(new Response('ok', { status: 200 }))
    })

    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 3,
      retryBackoffMs: 1000,
      fetch: fetchMock,
    })

    transport.log(makeEntry('retry-me'))

    // First attempt fails, then backoff 1000ms, second succeeds
    await vi.advanceTimersByTimeAsync(1_001)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    await transport.close()
  })

  test('fetch called maxRetries+1 times total before dropping', async () => {
    const fetchMock = makeFailFetch(500)
    const onError = vi.fn()

    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 3,
      retryBackoffMs: 100,
      fetch: fetchMock,
      onError,
    })

    transport.log(makeEntry('will-fail'))

    // Advance through all retries: 100 + 200 + 400 = 700ms
    await vi.advanceTimersByTimeAsync(1_000)

    // Initial attempt + 3 retries = 4 total calls
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(onError).toHaveBeenCalledTimes(1)

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Exponential backoff timing
// ---------------------------------------------------------------------------

describe('exponential backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('backoff delays double: 1000 → 2000 → 4000', async () => {
    const callTimes: number[] = []
    const fetchMock = vi.fn(() => {
      callTimes.push(Date.now())
      return Promise.resolve(new Response('err', { status: 500 }))
    })

    const onError = vi.fn()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 3,
      retryBackoffMs: 1000,
      fetch: fetchMock,
      onError,
    })

    transport.log(makeEntry('backoff-test'))

    // Advance step by step and record timings
    // attempt 0: immediate (batchSize=1 triggers immediately)
    await vi.advanceTimersByTimeAsync(0)
    // wait 1000ms for retry 1
    await vi.advanceTimersByTimeAsync(1000)
    // wait 2000ms for retry 2
    await vi.advanceTimersByTimeAsync(2000)
    // wait 4000ms for retry 3 (which is the final drop)
    await vi.advanceTimersByTimeAsync(4000)
    // allow microtasks to settle
    await vi.advanceTimersByTimeAsync(100)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(onError).toHaveBeenCalledTimes(1)

    // Verify approximate delays between calls
    if (callTimes.length >= 4) {
      const d1 = callTimes[1] - callTimes[0] // ~1000
      const d2 = callTimes[2] - callTimes[1] // ~2000
      const d3 = callTimes[3] - callTimes[2] // ~4000

      expect(d1).toBeGreaterThanOrEqual(900)
      expect(d2).toBeGreaterThanOrEqual(1900)
      expect(d3).toBeGreaterThanOrEqual(3900)
    }

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// maxRetries exhausted → onError + console.error
// ---------------------------------------------------------------------------

describe('maxRetries exhausted', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('calls onError with batch and logs console.error', async () => {
    const fetchMock = makeFailFetch(503)
    const onError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const entry = makeEntry('drop-me')
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 2,
      retryBackoffMs: 100,
      fetch: fetchMock,
      onError,
    })

    transport.log(entry)

    // 100 + 200 = 300ms of backoff
    await vi.advanceTimersByTimeAsync(500)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][1]).toHaveLength(1)

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0][0]).toContain('[HTTPTransport]')

    consoleError.mockRestore()
    await transport.close()
  })

  test('does not throw after maxRetries', async () => {
    const fetchMock = makeFailFetch(500)
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 1,
      retryBackoffMs: 100,
      fetch: fetchMock,
    })

    transport.log(makeEntry('safe'))

    // Should not throw
    await expect(vi.advanceTimersByTimeAsync(300)).resolves.not.toThrow()

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Custom serializer
// ---------------------------------------------------------------------------

describe('custom serializer', () => {
  test('uses custom serializer for request body', async () => {
    const fetchMock = makeOkFetch()
    const serializer = vi.fn((entries: LogEntry[]) =>
      JSON.stringify({ logs: entries }),
    )

    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
      serializer,
    })

    transport.log(makeEntry('custom'))
    await transport.flush()

    expect(serializer).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.logs).toBeDefined()
    expect(body.entries).toBeUndefined()

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Custom headers
// ---------------------------------------------------------------------------

describe('custom headers', () => {
  test('passes Authorization and custom headers to fetch', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      headers: { Authorization: 'Bearer secret', 'X-Custom': 'val' },
      fetch: fetchMock,
    })

    transport.log(makeEntry('headers-test'))
    await transport.flush()

    const reqHeaders = fetchMock.mock.calls[0][1].headers
    expect(reqHeaders['Authorization']).toBe('Bearer secret')
    expect(reqHeaders['X-Custom']).toBe('val')
    expect(reqHeaders['content-type']).toBe('application/json')

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Timeout via AbortController
// ---------------------------------------------------------------------------

describe('timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    vi.useRealTimers()
  })

  test('aborts fetch after timeoutMs and retries', async () => {
    // Fetch that never resolves, but respects abort signal
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal as AbortSignal
        if (signal.aborted) {
          reject(new DOMException('Already aborted', 'AbortError'))
          return
        }
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    const onError = vi.fn()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      timeoutMs: 2_000,
      maxRetries: 0, // drop immediately after timeout
      retryBackoffMs: 100,
      fetch: fetchMock,
      onError,
    })

    transport.log(makeEntry('timeout-test'))

    // Advance past timeout
    await vi.advanceTimersByTimeAsync(2_001)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// minLevel filtering
// ---------------------------------------------------------------------------

describe('minLevel', () => {
  test('does not enqueue entries below minLevel', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      minLevel: LogLevel.WARN,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('debug-msg', LogLevel.DEBUG))
    transport.log(makeEntry('info-msg', LogLevel.INFO))
    await transport.flush()

    // Neither entry is above WARN, so no fetch call
    expect(fetchMock).not.toHaveBeenCalled()

    await transport.close()
  })

  test('enqueues entries at or above minLevel', async () => {
    const fetchMock = makeOkFetch()
    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 1,
      flushIntervalMs: 60_000,
      minLevel: LogLevel.WARN,
      maxRetries: 0,
      fetch: fetchMock,
    })

    transport.log(makeEntry('warn-msg', LogLevel.WARN))
    await transport.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await transport.close()
  })
})

// ---------------------------------------------------------------------------
// Concurrent batch safety — close() must not return before second batch completes
// ---------------------------------------------------------------------------

describe('concurrent batch + close safety', () => {
  test('close() waits for all in-flight batches before returning', async () => {
    let resolveFirst!: () => void
    let callCount = 0
    const responses: string[][] = []

    // slow fetch: first call blocks until resolveFirst() is called
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string)
      const msgs = body.entries.map((e: LogEntry) => e.message)
      callCount++
      if (callCount === 1) {
        return new Promise<Response>((res) => {
          resolveFirst = () => {
            responses.push(msgs)
            res(new Response('ok', { status: 200 }))
          }
        })
      }
      responses.push(msgs)
      return Promise.resolve(new Response('ok', { status: 200 }))
    })

    const transport = new HTTPTransport({
      url: 'https://example.com/logs',
      batchSize: 2,
      flushIntervalMs: 60_000,
      maxRetries: 0,
      fetch: fetchMock,
    })

    // Trigger first batch
    transport.log(makeEntry('a'))
    transport.log(makeEntry('b'))

    // Trigger second batch while first is still inflight
    transport.log(makeEntry('c'))
    transport.log(makeEntry('d'))

    // Resolve first batch so second can proceed
    resolveFirst()

    // close() must await both batches
    await transport.close()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Both batches delivered
    const allMsgs = responses.flat()
    expect(allMsgs).toContain('a')
    expect(allMsgs).toContain('c')
  })
})

// ---------------------------------------------------------------------------
// Default export name
// ---------------------------------------------------------------------------

describe('transport name', () => {
  test('defaults to "http"', () => {
    const transport = new HTTPTransport({
      url: 'https://example.com',
      fetch: makeOkFetch(),
    })
    expect(transport.name).toBe('http')
  })

  test('accepts custom name', () => {
    const transport = new HTTPTransport({
      url: 'https://example.com',
      name: 'my-http',
      fetch: makeOkFetch(),
    })
    expect(transport.name).toBe('my-http')
  })

  test('enabled defaults to true', () => {
    const transport = new HTTPTransport({
      url: 'https://example.com',
      fetch: makeOkFetch(),
    })
    expect(transport.enabled).toBe(true)
  })

  test('enabled: false', () => {
    const transport = new HTTPTransport({
      url: 'https://example.com',
      fetch: makeOkFetch(),
      enabled: false,
    })
    expect(transport.enabled).toBe(false)
  })
})
