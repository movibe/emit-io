import { test, expect, describe, vi } from 'vitest'
import { withAnalytics } from '../server.js'
import type { LoggerStrategy } from '@emit/logger'

describe('withAnalytics', () => {
  test('calls the action and returns the result', async () => {
    const action = vi.fn().mockResolvedValue('hello')
    const wrapped = withAnalytics(action, { eventName: 'test-action' })

    const result = await wrapped('arg1', 'arg2')

    expect(action).toHaveBeenCalledWith('arg1', 'arg2')
    expect(result).toBe('hello')
  })

  test('fires event with status=success on successful action', async () => {
    const mockLogger = { event: vi.fn() } as unknown as LoggerStrategy
    const action = vi.fn().mockResolvedValue(42)
    const wrapped = withAnalytics(action, { eventName: 'my-event', logger: mockLogger })

    await wrapped()

    expect(mockLogger.event).toHaveBeenCalledOnce()
    const [eventName, props] = (mockLogger.event as any).mock.calls[0]
    expect(eventName).toBe('my-event')
    expect(props.status).toBe('success')
    expect(typeof props.durationMs).toBe('number')
  })

  test('fires event with status=error and re-throws on failed action', async () => {
    const mockLogger = { event: vi.fn() } as unknown as LoggerStrategy
    const error = new Error('boom')
    const action = vi.fn().mockRejectedValue(error)
    const wrapped = withAnalytics(action, { eventName: 'my-event', logger: mockLogger })

    await expect(wrapped()).rejects.toThrow('boom')

    expect(mockLogger.event).toHaveBeenCalledOnce()
    const [eventName, props] = (mockLogger.event as any).mock.calls[0]
    expect(eventName).toBe('my-event')
    expect(props.status).toBe('error')
    expect(props.error).toBe('boom')
    expect(typeof props.durationMs).toBe('number')
  })

  test('durationMs is a non-negative number', async () => {
    const mockLogger = { event: vi.fn() } as unknown as LoggerStrategy
    const action = vi.fn().mockResolvedValue(undefined)
    const wrapped = withAnalytics(action, { eventName: 'timed', logger: mockLogger })

    await wrapped()

    const [, props] = (mockLogger.event as any).mock.calls[0]
    expect(props.durationMs).toBeGreaterThanOrEqual(0)
  })

  test('respects extractProps and merges with event props', async () => {
    const mockLogger = { event: vi.fn() } as unknown as LoggerStrategy
    const action = vi.fn().mockResolvedValue(null)
    const wrapped = withAnalytics(action, {
      eventName: 'form-submit',
      logger: mockLogger,
      extractProps: (formData: { email: string }) => ({ email: formData.email }),
    })

    await wrapped({ email: 'test@example.com' })

    const [, props] = (mockLogger.event as any).mock.calls[0]
    expect(props.email).toBe('test@example.com')
    expect(props.status).toBe('success')
  })

  test('does not crash when no logger is provided', async () => {
    const action = vi.fn().mockResolvedValue('ok')
    const wrapped = withAnalytics(action, { eventName: 'no-logger' })

    await expect(wrapped()).resolves.toBe('ok')
  })

  test('does not crash on error when no logger is provided', async () => {
    const action = vi.fn().mockRejectedValue(new Error('fail'))
    const wrapped = withAnalytics(action, { eventName: 'no-logger' })

    await expect(wrapped()).rejects.toThrow('fail')
  })
})
