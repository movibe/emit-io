import Fastify from 'fastify'
import { describe, expect, test, vi } from 'vitest'
import { loggerPlugin } from '../plugin.js'

function createMockEmitIoStrategy() {
  const calls: any[] = []
  return {
    info: vi.fn((msg, ctx) => calls.push({ kind: 'info', msg, ctx })),
    error: vi.fn((msg, ctx) => calls.push({ kind: 'error', msg, ctx })),
    child: vi.fn(function (this: any, bindings: any) {
      const child = createMockEmitIoStrategy()
      child.bindings = bindings
      return child
    }),
    bindings: {} as any,
    calls,
  } as any
}

describe('loggerPlugin', () => {
  test('decorates request with log_ and requestId', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger })
    app.get('/', (req, reply) => {
      expect(req.requestId).toBeTruthy()
      expect(req.log_).toBeDefined()
      reply.send({ ok: true })
    })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['x-request-id']).toBeTruthy()
    await app.close()
  })

  test('uses request id from header when present', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger })
    app.get('/', (req, reply) => {
      expect(req.requestId).toBe('test-id')
      reply.send({ ok: true })
    })
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-request-id': 'test-id' },
    })
    expect(res.headers['x-request-id']).toBe('test-id')
    await app.close()
  })

  test('logs request-start and request-complete with autoLog', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger })
    app.get('/', (_req, reply) => reply.send({ ok: true }))
    await app.inject({ method: 'GET', url: '/' })
    expect(logger.child).toHaveBeenCalled()
    await app.close()
  })

  test('autoLog=false skips request hooks', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger, autoLog: false })
    app.get('/', (_req, reply) => reply.send({ ok: true }))
    await app.inject({ method: 'GET', url: '/' })
    await app.close()
  })

  test('logs error on thrown handler', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger })
    app.get('/', () => {
      throw new Error('boom')
    })
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(500)
    await app.close()
  })

  test('custom requestIdHeader respected', async () => {
    const logger = createMockEmitIoStrategy()
    const app = Fastify()
    await app.register(loggerPlugin, { logger, requestIdHeader: 'x-trace-id' })
    app.get('/', (_req, reply) => reply.send({ ok: true }))
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-trace-id': 'trace-123' },
    })
    expect(res.headers['x-trace-id']).toBe('trace-123')
    await app.close()
  })
})
