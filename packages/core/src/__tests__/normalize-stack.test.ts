import { test, expect, describe } from 'vitest'
import { normalizeStack } from '../plugins/normalize-stack.js'
import { LogLevel } from '../types.js'
import type { LogEntry } from '../types.js'

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: LogLevel.ERROR,
    message: 'test',
    timestamp: new Date(),
    ...overrides,
  }
}

const V8_STACK = `Error: boom
    at foo (/a/b.ts:12:5)
    at /a/c.ts:7:2`

const WEBKIT_STACK = `boom
foo@/a/b.ts:12:5
@/a/c.ts:7:2`

describe('normalizeStack', () => {
  test('parses V8 stack with named function', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames).toHaveLength(2)
    expect(frames[0]).toMatchObject({
      function: 'foo',
      file: '/a/b.ts',
      line: 12,
      col: 5,
    })
  })

  test('parses V8 anonymous frame (no function name)', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames[1]).toMatchObject({
      function: undefined,
      file: '/a/c.ts',
      line: 7,
      col: 2,
    })
  })

  test('parses WebKit stack with named function', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: WEBKIT_STACK } as Error })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames).toHaveLength(2)
    expect(frames[0]).toMatchObject({
      function: 'foo',
      file: '/a/b.ts',
      line: 12,
      col: 5,
    })
  })

  test('parses Firefox stack (same as WebKit format)', () => {
    const firefoxStack = `boom@/a/b.ts:12:5\n@/a/c.ts:7:2`
    const plugin = normalizeStack()
    // Firefox stacks may not have an initial "Error: " line, simulate direct context stack
    const entry = makeEntry({ context: { stack: `Error: x\n${firefoxStack}` } })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames[0]).toMatchObject({
      function: 'boom',
      file: '/a/b.ts',
      line: 12,
      col: 5,
    })
  })

  test('unparseable line preserves raw, no other fields', () => {
    const stack = `Error: x\nnot-a-valid-frame-line`
    const plugin = normalizeStack()
    const entry = makeEntry({ error: { name: 'Error', message: 'x', stack } as Error })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames).toHaveLength(1)
    expect(frames[0].raw).toBe('not-a-valid-frame-line')
    expect(frames[0].file).toBeUndefined()
    expect(frames[0].function).toBeUndefined()
    expect(frames[0].line).toBeUndefined()
    expect(frames[0].col).toBeUndefined()
  })

  test('maxFrames limits frames returned', () => {
    const plugin = normalizeStack({ maxFrames: 1 })
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames).toHaveLength(1)
    expect(frames[0].function).toBe('foo')
  })

  test('returns entry unchanged when no stack present', () => {
    const plugin = normalizeStack()
    const entry = makeEntry()
    const result = plugin(entry)!

    expect(result).toBe(entry)
    expect(result.context?.stackFrames).toBeUndefined()
  })

  test('fromError=false ignores error.stack', () => {
    const plugin = normalizeStack({ fromError: false })
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error })
    const result = plugin(entry)!

    expect(result.context?.stackFrames).toBeUndefined()
  })

  test('fromContext=false ignores context.stack', () => {
    const plugin = normalizeStack({ fromContext: false })
    const entry = makeEntry({ context: { stack: V8_STACK } })
    const result = plugin(entry)!

    expect(result.context?.stackFrames).toBeUndefined()
  })

  test('frames inserted into context.stackFrames', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({
      context: { existing: 'value' },
      error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error,
    })
    const result = plugin(entry)!

    expect(result.context?.existing).toBe('value')
    expect(Array.isArray(result.context?.stackFrames)).toBe(true)
  })

  test('original stack string is preserved on entry.error.stack', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({ error: { name: 'Error', message: 'boom', stack: V8_STACK } as Error })
    const result = plugin(entry)!

    expect(result.error?.stack).toBe(V8_STACK)
  })

  test('reads from context.stack when error.stack not available', () => {
    const plugin = normalizeStack()
    const entry = makeEntry({ context: { stack: V8_STACK } })
    const result = plugin(entry)!
    const frames = result.context?.stackFrames as any[]

    expect(frames).toHaveLength(2)
    expect(frames[0].function).toBe('foo')
  })
})
