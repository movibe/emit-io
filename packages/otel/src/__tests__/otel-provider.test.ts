import { test, expect, describe, vi, beforeEach } from 'vitest'
import { trace } from '@opentelemetry/api'
import { OTelProvider } from '../otel-provider.js'

describe('OTelProvider', () => {
  let mockSpan: any
  let mockTracer: any
  let getTracerSpy: any

  beforeEach(() => {
    mockSpan = {
      end: vi.fn(),
      recordException: vi.fn(),
    }
    mockTracer = {
      startSpan: vi.fn(() => mockSpan),
    }
    getTracerSpy = vi.spyOn(trace, 'getTracer').mockReturnValue(mockTracer)
  })

  test('event() starts and ends span', () => {
    const p = new OTelProvider()
    p.event('user-login', { method: 'email' })
    expect(mockTracer.startSpan).toHaveBeenCalledWith('analytics.user-login', expect.objectContaining({
      attributes: expect.objectContaining({
        'analytics.event.name': 'user-login',
        method: 'email',
      }),
    }))
    expect(mockSpan.end).toHaveBeenCalled()
  })

  test('identify() emits user attributes', () => {
    const p = new OTelProvider()
    p.identify({ id: 'u1', email: 'x@y.com' })
    expect(mockTracer.startSpan).toHaveBeenCalledWith('analytics.identify', expect.objectContaining({
      attributes: expect.objectContaining({ 'analytics.user.id': 'u1' }),
    }))
  })

  test('screen() includes screen name', () => {
    const p = new OTelProvider()
    p.screen('Home', { ref: 'campaign' })
    expect(mockTracer.startSpan).toHaveBeenCalledWith('analytics.screen.Home', expect.any(Object))
  })

  test('error() records exception', () => {
    const p = new OTelProvider()
    const err = new Error('boom')
    p.error('Feature', 'fail', true, err, { extra: 1 })
    expect(mockSpan.recordException).toHaveBeenCalledWith(err)
    expect(mockSpan.end).toHaveBeenCalled()
  })

  test('flatten serializes nested values to JSON', () => {
    const p = new OTelProvider()
    p.event('x', { nested: { a: 1 } })
    const call = mockTracer.startSpan.mock.calls[0]
    expect(call[1].attributes.nested).toBe(JSON.stringify({ a: 1 }))
  })

  test('respects enabled=false (preserved by Logger, but flag still readable)', () => {
    const p = new OTelProvider({ enabled: false })
    expect(p.enabled).toBe(false)
  })
})
