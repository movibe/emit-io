import { test, expect, describe, vi } from 'vitest'
import { ConsoleTransport, ConsoleProvider } from '../console'
import { LogLevel } from '../types'

describe('ConsoleTransport', () => {
  test('should create with defaults', () => {
    const t = new ConsoleTransport()
    expect(t.name).toBe('console')
    expect(t.minLevel).toBe(LogLevel.DEBUG)
  })

  test('should create with custom options', () => {
    const t = new ConsoleTransport({ name: 'test', minLevel: LogLevel.WARN })
    expect(t.name).toBe('test')
    expect(t.minLevel).toBe(LogLevel.WARN)
  })

  test('should log entry at correct level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const t = new ConsoleTransport({ pretty: false })

    t.log({ level: LogLevel.INFO, message: 'test', timestamp: new Date() })
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  test('should use console.error for ERROR level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = new ConsoleTransport({ pretty: false })

    t.log({ level: LogLevel.ERROR, message: 'error test', timestamp: new Date() })
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  test('should use console.warn for WARN level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = new ConsoleTransport({ pretty: false })

    t.log({ level: LogLevel.WARN, message: 'warn test', timestamp: new Date() })
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  test('should include context in entry', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const t = new ConsoleTransport({ pretty: false })

    t.log({ level: LogLevel.INFO, message: 'with context', timestamp: new Date(), context: { key: 'val' } })
    const arg = spy.mock.calls[0][0]
    expect(arg).toContain('with context')

    spy.mockRestore()
  })

  test('should include error stack in entry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = new ConsoleTransport({ pretty: true })

    const error = new Error('test error')
    t.log({ level: LogLevel.ERROR, message: 'err', timestamp: new Date(), error })
    const arg = spy.mock.calls[0][0]
    expect(arg).toContain('test error')

    spy.mockRestore()
  })
})

describe('ConsoleProvider', () => {
  test('should create with defaults', () => {
    const p = new ConsoleProvider()
    expect(p.name).toBe('console-analytics')
    expect(p.enabled).toBe(true)
  })

  test('should create with custom name', () => {
    const p = new ConsoleProvider({ name: 'custom' })
    expect(p.name).toBe('custom')
  })

  test('should call console.log on init', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const p = new ConsoleProvider()
    p.init()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('should call console.log on event', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const p = new ConsoleProvider()
    p.event('test-event', { key: 'val' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('should call console.log on identify', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const p = new ConsoleProvider()
    p.identify({ id: 'user-1' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('should call console.error on error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const p = new ConsoleProvider()
    p.error('Feature', 'fail', true, new Error('test'))
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('flush and reset should not throw', () => {
    const p = new ConsoleProvider()
    expect(() => p.flush()).not.toThrow()
    expect(() => p.reset()).not.toThrow()
  })
})
