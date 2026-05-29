import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { rateLimit } from '../plugins/rate-limit.js'
import type { LogEntry } from '../types.js'
import { LogLevel } from '../types.js'

function makeEntry(userId?: string): LogEntry {
  return {
    level: LogLevel.INFO,
    message: 'test',
    timestamp: new Date(),
    context: userId ? { userId } : undefined,
  }
}

describe('rateLimit plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('max=3, windowMs=1000: 5 sequential calls → 3 pass, 2 drop', () => {
    const plugin = rateLimit({ max: 3, windowMs: 1000 })
    const results = Array.from({ length: 5 }, () => plugin(makeEntry()))
    const passed = results.filter((r) => r !== null).length
    const dropped = results.filter((r) => r === null).length
    expect(passed).toBe(3)
    expect(dropped).toBe(2)
  })

  test('key bucketing: userA and userB are independent', () => {
    const plugin = rateLimit({
      max: 2,
      windowMs: 1000,
      key: (entry) => (entry.context?.userId as string) ?? 'global',
    })
    const entryA = makeEntry('userA')
    const entryB = makeEntry('userB')

    // 2 for A
    expect(plugin(entryA)).not.toBeNull()
    expect(plugin(entryA)).not.toBeNull()
    // 3rd for A → dropped
    expect(plugin(entryA)).toBeNull()

    // B still has its own bucket
    expect(plugin(entryB)).not.toBeNull()
    expect(plugin(entryB)).not.toBeNull()
    // 3rd for B → dropped
    expect(plugin(entryB)).toBeNull()
  })

  test('reset after windowMs allows new requests', () => {
    const plugin = rateLimit({ max: 2, windowMs: 1000 })

    expect(plugin(makeEntry())).not.toBeNull()
    expect(plugin(makeEntry())).not.toBeNull()
    expect(plugin(makeEntry())).toBeNull()

    // Advance past the window
    vi.advanceTimersByTime(1001)

    // Bucket should have reset
    expect(plugin(makeEntry())).not.toBeNull()
    expect(plugin(makeEntry())).not.toBeNull()
    expect(plugin(makeEntry())).toBeNull()
  })

  test('default key is global', () => {
    // No key function → all entries share 'global' bucket
    const plugin = rateLimit({ max: 1, windowMs: 1000 })
    const entryA = makeEntry('userA')
    const entryB = makeEntry('userB')

    expect(plugin(entryA)).not.toBeNull()
    // Different user but same default 'global' bucket → dropped
    expect(plugin(entryB)).toBeNull()
  })
})
