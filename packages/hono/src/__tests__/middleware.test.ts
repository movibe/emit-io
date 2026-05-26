import { test, expect, describe, vi } from 'vitest'
import { Hono } from 'hono'
import { loggerMiddleware } from '../middleware.js'

function createMockLogger() {
  const childCalls: any[] = []
  const createMock = (): any => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(function(this: any, bindings: any) {
      childCalls.push(bindings)
      const m = createMock()
      m.bindings = bindings
      return m
    }),
  })
  const root = createMock()
  root.childCalls = childCalls
  return root
}

describe('loggerMiddleware', () => {
  test('sets requestId and logger in context', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger }))
    app.get('/', (c) => {
      const reqId = c.get('requestId' as any)
      const l = c.get('logger' as any)
      expect(reqId).toBeTruthy()
      expect(l).toBeDefined()
      return c.text('ok')
    })
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  test('uses request id from header when present', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger }))
    app.get('/', (c) => c.text(c.get('requestId' as any) as string))
    const res = await app.request('/', { headers: { 'x-request-id': 'test-id' } })
    expect(await res.text()).toBe('test-id')
    expect(res.headers.get('x-request-id')).toBe('test-id')
  })

  test('logs request-start and request-complete', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger }))
    app.get('/', (c) => c.text('ok'))
    await app.request('/')
    expect(logger.child).toHaveBeenCalled()
    expect(logger.childCalls[0]).toMatchObject({ method: 'GET', path: '/' })
  })

  test('autoLog=false skips request logs', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger, autoLog: false }))
    app.get('/', (c) => c.text('ok'))
    await app.request('/')
    // child created, but child.info NOT called
    expect(logger.child).toHaveBeenCalled()
  })

  test('logs error on thrown handler', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger }))
    app.get('/', () => { throw new Error('boom') })
    app.onError((err, c) => c.text('handled: ' + err.message, 500))
    const res = await app.request('/')
    expect(res.status).toBe(500)
  })

  test('custom requestIdHeader respected', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger, requestIdHeader: 'x-trace-id' }))
    app.get('/', (c) => c.text('ok'))
    const res = await app.request('/', { headers: { 'x-trace-id': 'trace-123' } })
    expect(res.headers.get('x-trace-id')).toBe('trace-123')
  })

  test('contextKey custom name', async () => {
    const logger = createMockLogger()
    const app = new Hono()
    app.use('*', loggerMiddleware({ logger, contextKey: 'log' }))
    app.get('/', (c) => {
      const l = c.get('log' as any)
      expect(l).toBeDefined()
      return c.text('ok')
    })
    await app.request('/')
  })
})
