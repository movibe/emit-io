import { test, expect, describe, vi } from 'vitest'
import { LoggerStrategy, LogLevelEnum } from '../index.js'
import type { Transport, LogEntry } from '../index.js'

function makeTransport() {
  const entries: LogEntry[] = []
  const transport: Transport = {
    name: 'test',
    minLevel: LogLevelEnum.DEBUG,
    log: (entry) => { entries.push(entry) },
  }
  return { transport, entries }
}

describe('child loggers', () => {
  test('child merges bindings into entry.context', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'abc-123' })

    child.info('hello', { userId: 'u1' })

    expect(entries).toHaveLength(1)
    expect(entries[0].context).toEqual({ requestId: 'abc-123', userId: 'u1' })
  })

  test('nested child merges both levels of bindings', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'abc-123' })
    const nested = child.child({ traceId: 'tx' })

    nested.warn('warn')

    expect(entries).toHaveLength(1)
    expect(entries[0].context).toEqual({ requestId: 'abc-123', traceId: 'tx' })
  })

  test('direct context argument overrides bindings', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'from-binding' })

    child.info('msg', { requestId: 'from-context', extra: true })

    expect(entries[0].context).toEqual({ requestId: 'from-context', extra: true })
  })

  test('child binding overrides parent binding on same key', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'parent' })
    const nested = child.child({ requestId: 'child' })

    nested.debug('msg')

    expect(entries[0].context?.requestId).toBe('child')
  })

  test('child shares transport array reference with parent', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ service: 'api' })

    // add transport to parent after creating child
    const { transport: t2, entries: entries2 } = makeTransport()
    log.addTransport(t2)

    child.info('msg')

    // child sees the newly added transport because they share the same array
    expect(entries2).toHaveLength(1)
    expect(entries).toHaveLength(1)
  })

  test('child with empty bindings object works correctly', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({})

    child.info('hello', { key: 'value' })

    expect(entries[0].context).toEqual({ key: 'value' })
  })

  test('all log methods apply bindings — debug', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ svc: 'x' })

    child.debug('d')
    expect(entries[0].context?.svc).toBe('x')
  })

  test('all log methods apply bindings — warn', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ svc: 'x' })

    child.warn('w')
    expect(entries[0].context?.svc).toBe('x')
  })

  test('all log methods apply bindings — error (log-level overload)', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ svc: 'x' })

    child.error('err')
    expect(entries[0].context?.svc).toBe('x')
  })

  test('all log methods apply bindings — fatal', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ svc: 'x' })

    child.fatal('f')
    expect(entries[0].context?.svc).toBe('x')
  })

  test('all log methods apply bindings — log() legacy method', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ svc: 'x' })

    child.log('app_start' as any, { extra: 1 })
    expect(entries[0].context?.svc).toBe('x')
  })

  test('parent logger is unaffected by child bindings', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    log.child({ requestId: 'abc' })

    log.info('parent msg', { key: 'val' })

    expect(entries[0].context).toEqual({ key: 'val' })
  })

  test('child without context still gets bindings in context', () => {
    const { transport, entries } = makeTransport()
    const log = new LoggerStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'r1' })

    child.info('no context')

    expect(entries[0].context).toEqual({ requestId: 'r1' })
  })
})
