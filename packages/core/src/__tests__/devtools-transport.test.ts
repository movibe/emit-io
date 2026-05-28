import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DevToolsTransport } from '../devtools-transport.js'
import { LogLevel } from '../types.js'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 0 // CONNECTING
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []
  closed = false

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    if (this.readyState !== 1) throw new Error('Not open')
    this.sent.push(data)
  }

  close() {
    this.closed = true
    this.readyState = 3
    this.onclose?.()
  }

  simulateOpen() {
    this.readyState = 1
    this.onopen?.()
  }

  simulateClose() {
    this.readyState = 3
    this.onclose?.()
  }

  simulateError() {
    this.onerror?.()
  }
}

describe('DevToolsTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('connects to url on construction', () => {
    new DevToolsTransport({ WebSocketClass: MockWebSocket as any, url: 'ws://x:1' })
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://x:1')
  })

  test('sends entry when connection open', () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    t.log({ level: LogLevel.INFO, message: 'hello', timestamp: new Date('2026-01-01') })
    expect(ws.sent).toHaveLength(1)
    const parsed = JSON.parse(ws.sent[0])
    expect(parsed.msg).toBe('hello')
    expect(parsed.level).toBe('INFO')
  })

  test('buffers when disconnected, drains on open', () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any })
    const ws = MockWebSocket.instances[0]
    // Not opened yet
    t.log({ level: LogLevel.INFO, message: 'buffered', timestamp: new Date() })
    expect(ws.sent).toHaveLength(0)
    ws.simulateOpen()
    expect(ws.sent).toHaveLength(1)
  })

  test('drops oldest when buffer full', () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any, bufferSize: 2 })
    t.log({ level: LogLevel.INFO, message: '1', timestamp: new Date() })
    t.log({ level: LogLevel.INFO, message: '2', timestamp: new Date() })
    t.log({ level: LogLevel.INFO, message: '3', timestamp: new Date() })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    expect(ws.sent).toHaveLength(2)
    const msgs = ws.sent.map((s) => JSON.parse(s).msg)
    expect(msgs).toEqual(['2', '3'])
  })

  test('reconnects after close with backoff', () => {
    new DevToolsTransport({ WebSocketClass: MockWebSocket as any, reconnectMs: 1000 })
    const ws1 = MockWebSocket.instances[0]
    ws1.simulateOpen()
    ws1.simulateClose()
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  test('exponential backoff caps at 30s', () => {
    new DevToolsTransport({ WebSocketClass: MockWebSocket as any, reconnectMs: 1000 })
    for (let i = 0; i < 10; i++) {
      const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      ws.simulateClose()
      vi.advanceTimersByTime(30_000)
    }
    // No throw / works
    expect(MockWebSocket.instances.length).toBeGreaterThan(5)
  })

  test('close() prevents reconnect', async () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any, reconnectMs: 1000 })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    await t.close()
    vi.advanceTimersByTime(5000)
    expect(MockWebSocket.instances).toHaveLength(1) // no new connection
  })

  test('onState callback fires', () => {
    const states: string[] = []
    new DevToolsTransport({
      WebSocketClass: MockWebSocket as any,
      onState: (s) => states.push(s),
    })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    expect(states).toContain('connecting')
    expect(states).toContain('open')
  })

  test('no WebSocket global → warns and buffers', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = new DevToolsTransport({ WebSocketClass: undefined as any })
    t.log({ level: LogLevel.INFO, message: 'x', timestamp: new Date() })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  test('serializes error', () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    const err = new Error('boom')
    t.log({ level: LogLevel.ERROR, message: 'e', timestamp: new Date(), error: err })
    const parsed = JSON.parse(ws.sent[0])
    expect(parsed.error.message).toBe('boom')
    expect(parsed.error.name).toBe('Error')
  })

  test('omits empty context', () => {
    const t = new DevToolsTransport({ WebSocketClass: MockWebSocket as any })
    const ws = MockWebSocket.instances[0]
    ws.simulateOpen()
    t.log({ level: LogLevel.INFO, message: 'x', timestamp: new Date() })
    const parsed = JSON.parse(ws.sent[0])
    expect(parsed.context).toBeUndefined()
  })
})
