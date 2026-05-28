import { describe, expect, test } from 'vitest'
import { sample } from '../plugins/sample.js'
import type { LogEntry } from '../types.js'
import { LogLevel } from '../types.js'

function makeEntry(level: LogLevel, message = 'test'): LogEntry {
  return { level, message, timestamp: new Date() }
}

describe('sample plugin', () => {
  test('rate=1 always passes (10 calls, 10 results)', () => {
    const plugin = sample({ rate: 1 })
    const results = Array.from({ length: 10 }, () => plugin(makeEntry(LogLevel.INFO)))
    expect(results.every((r) => r !== null)).toBe(true)
  })

  test('rate=0 always drops (10 calls, 0 results)', () => {
    const plugin = sample({ rate: 0 })
    const results = Array.from({ length: 10 }, () => plugin(makeEntry(LogLevel.INFO)))
    expect(results.every((r) => r === null)).toBe(true)
  })

  test('levels filter: ERROR not in levels → always kept', () => {
    const plugin = sample({ rate: 0, levels: [LogLevel.INFO, LogLevel.DEBUG] })
    const entry = makeEntry(LogLevel.ERROR)
    const result = plugin(entry)
    expect(result).toBe(entry)
  })

  test('levels filter: INFO in levels → sampled with rate', () => {
    const plugin = sample({ rate: 0, levels: [LogLevel.INFO, LogLevel.DEBUG] })
    const entry = makeEntry(LogLevel.INFO)
    const result = plugin(entry)
    expect(result).toBeNull()
  })

  test('random=()=>0.05 with rate=0.1 always passes', () => {
    const plugin = sample({ rate: 0.1, random: () => 0.05 })
    const results = Array.from({ length: 10 }, () => plugin(makeEntry(LogLevel.INFO)))
    expect(results.every((r) => r !== null)).toBe(true)
  })

  test('random=()=>0.5 with rate=0.1 always drops', () => {
    const plugin = sample({ rate: 0.1, random: () => 0.5 })
    const results = Array.from({ length: 10 }, () => plugin(makeEntry(LogLevel.INFO)))
    expect(results.every((r) => r === null)).toBe(true)
  })

  test('no levels opt → all levels sampled', () => {
    // rate=0 drops everything when no levels filter
    const plugin = sample({ rate: 0 })
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL]
    const results = levels.map((level) => plugin(makeEntry(level)))
    expect(results.every((r) => r === null)).toBe(true)
  })
})
