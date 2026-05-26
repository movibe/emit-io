import { test, expect, describe, vi } from 'vitest'
import { JSONTransport } from '../json-transport.js'
import { LogLevel } from '../types.js'
import type { LogEntry } from '../types.js'

function makeEntry(overrides?: Partial<LogEntry>): LogEntry {
  return {
    level: LogLevel.INFO,
    message: 'hello',
    timestamp: new Date('2026-05-26T12:00:00.000Z'),
    ...overrides,
  }
}

describe('JSONTransport', () => {
  test('writes one line per entry, terminated with \\n', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry())

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/\n$/)
  })

  test('level is serialized as string label, not number', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ level: LogLevel.WARN }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.level).toBe('WARN')
    expect(typeof parsed.level).toBe('string')
  })

  test('all level labels are correct', () => {
    const pairs: [LogLevel, string][] = [
      [LogLevel.DEBUG, 'DEBUG'],
      [LogLevel.INFO, 'INFO'],
      [LogLevel.WARN, 'WARN'],
      [LogLevel.ERROR, 'ERROR'],
      [LogLevel.FATAL, 'FATAL'],
    ]
    pairs.forEach(([level, label]) => {
      const lines: string[] = []
      const t = new JSONTransport({ write: (l) => lines.push(l) })
      t.log(makeEntry({ level }))
      expect(JSON.parse(lines[0]).level).toBe(label)
    })
  })

  test('timestamp is serialized as ISO 8601 string in "time" field', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })
    const timestamp = new Date('2026-05-26T12:34:56.789Z')

    transport.log(makeEntry({ timestamp }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.time).toBe('2026-05-26T12:34:56.789Z')
    expect(parsed.msg).toBe('hello')
  })

  test('message is aliased to "msg"', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ message: 'test message' }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.msg).toBe('test message')
  })

  test('context is omitted when absent', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ context: undefined }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.context).toBeUndefined()
  })

  test('context is omitted when empty object', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ context: {} }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.context).toBeUndefined()
  })

  test('context is included when non-empty', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ context: { userId: 'u1', tenant: 'acme' } }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.context).toEqual({ userId: 'u1', tenant: 'acme' })
  })

  test('error is omitted when absent', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    transport.log(makeEntry({ error: undefined }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.error).toBeUndefined()
  })

  test('error is serialized as { name, message, stack }', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })
    const err = new Error('something went wrong')
    err.name = 'TypeError'

    transport.log(makeEntry({ error: err }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.error).toMatchObject({
      name: 'TypeError',
      message: 'something went wrong',
    })
    expect(typeof parsed.error.stack).toBe('string')
  })

  test('custom serializer is applied', () => {
    const lines: string[] = []
    const transport = new JSONTransport({
      write: (l) => lines.push(l),
      serializer: (entry) => ({
        lvl: entry.level,
        text: entry.message,
        ts: entry.timestamp.getTime(),
      }),
    })

    transport.log(makeEntry({ message: 'custom', timestamp: new Date('2026-05-26T00:00:00.000Z') }))

    const parsed = JSON.parse(lines[0])
    expect(parsed.text).toBe('custom')
    expect(parsed.lvl).toBe(LogLevel.INFO)
    expect(typeof parsed.ts).toBe('number')
  })

  test('circular reference does not crash — writes fallback line', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    // Build a circular object
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular

    // Use a custom serializer that returns a circular object so JSON.stringify fails
    const circularTransport = new JSONTransport({
      write: (l) => lines.push(l),
      serializer: () => circular,
    })

    expect(() => circularTransport.log(makeEntry())).not.toThrow()
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/\n$/)

    // The fallback line must be valid JSON
    const parsed = JSON.parse(lines[0])
    expect(parsed.level).toBe('ERROR')
    expect(parsed.msg).toBe('serialize failed')
  })

  test('minLevel is stored and accessible', () => {
    const transport = new JSONTransport({ minLevel: LogLevel.WARN })
    expect(transport.minLevel).toBe(LogLevel.WARN)
  })

  test('default name is "json"', () => {
    const transport = new JSONTransport()
    expect(transport.name).toBe('json')
  })

  test('custom name is respected', () => {
    const transport = new JSONTransport({ name: 'my-json' })
    expect(transport.name).toBe('my-json')
  })

  test('output is valid JSON on every line', () => {
    const lines: string[] = []
    const transport = new JSONTransport({ write: (l) => lines.push(l) })

    const entries: LogEntry[] = [
      makeEntry({ level: LogLevel.DEBUG, message: 'debug msg' }),
      makeEntry({ level: LogLevel.INFO, message: 'info msg', context: { key: 'val' } }),
      makeEntry({ level: LogLevel.ERROR, message: 'err msg', error: new Error('boom') }),
    ]

    entries.forEach((e) => transport.log(e))

    expect(lines).toHaveLength(3)
    lines.forEach((line) => {
      expect(() => JSON.parse(line)).not.toThrow()
    })
  })

  test('flush is a no-op and does not throw', () => {
    const transport = new JSONTransport()
    expect(() => transport.flush()).not.toThrow()
  })
})
