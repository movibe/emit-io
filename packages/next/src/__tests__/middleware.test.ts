import { beforeEach, describe, expect, test, vi } from 'vitest'
import { withLogger } from '../middleware.js'

function mockReq(opts: { method?: string; path?: string; headers?: Record<string, string> } = {}) {
  return {
    method: opts.method ?? 'GET',
    nextUrl: { pathname: opts.path ?? '/' },
    headers: { get: (k: string) => opts.headers?.[k] ?? null },
  } as any
}

function mockRes(status = 200) {
  return {
    status,
    headers: { set: vi.fn() },
  } as any
}

function mockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    event: vi.fn(),
  } as any
}

describe('withLogger middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('wraps handler and calls logger.info with status and durationMs', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ method: 'POST', path: '/api/test' })

    await wrapped(req)

    expect(logger.info).toHaveBeenCalledWith(
      'request',
      expect.objectContaining({
        method: 'POST',
        path: '/api/test',
        status: 200,
        durationMs: expect.any(Number),
      }),
    )
  })

  test('auto-generates requestId if x-request-id header is absent', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq()

    await wrapped(req)

    // header.set should be called with some uuid-like string
    expect(res.headers.set).toHaveBeenCalledWith('x-request-id', expect.any(String))
    const [, id] = res.headers.set.mock.calls[0]
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('preserves requestId from x-request-id header', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ headers: { 'x-request-id': 'my-custom-id' } })

    await wrapped(req)

    expect(res.headers.set).toHaveBeenCalledWith('x-request-id', 'my-custom-id')
  })

  test('sets x-request-id on the response headers', async () => {
    const logger = mockLogger()
    const res = mockRes(201)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ headers: { 'x-request-id': 'req-123' } })

    await wrapped(req)

    expect(res.headers.set).toHaveBeenCalledWith('x-request-id', 'req-123')
  })

  test('re-throws error and calls logger.error on handler failure', async () => {
    const logger = mockLogger()
    const handler = vi.fn().mockRejectedValue(new Error('boom'))
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ method: 'GET', path: '/fail' })

    await expect(wrapped(req)).rejects.toThrow('boom')
    expect(logger.error).toHaveBeenCalledWith(
      'request-failed',
      expect.objectContaining({
        method: 'GET',
        path: '/fail',
        error: 'boom',
        durationMs: expect.any(Number),
      }),
    )
  })

  test('emits pageview on GET by default', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ method: 'GET', path: '/home' })

    await wrapped(req)

    expect(logger.event).toHaveBeenCalledWith('pageview', { path: '/home' })
  })

  test('trackPageviews=false does not emit pageview', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger, trackPageviews: false })
    const req = mockReq({ method: 'GET', path: '/home' })

    await wrapped(req)

    expect(logger.event).not.toHaveBeenCalled()
  })

  test('does not emit pageview for non-GET methods', async () => {
    const logger = mockLogger()
    const res = mockRes(201)
    const handler = vi.fn().mockResolvedValue(res)
    const wrapped = withLogger(handler, { logger })
    const req = mockReq({ method: 'POST', path: '/api/data' })

    await wrapped(req)

    expect(logger.event).not.toHaveBeenCalled()
  })

  test('uses extractRequestId when provided', async () => {
    const logger = mockLogger()
    const res = mockRes(200)
    const handler = vi.fn().mockResolvedValue(res)
    const extractRequestId = vi.fn().mockReturnValue('extracted-id')
    const wrapped = withLogger(handler, { logger, extractRequestId })
    const req = mockReq()

    await wrapped(req)

    expect(extractRequestId).toHaveBeenCalledWith(req)
    expect(res.headers.set).toHaveBeenCalledWith('x-request-id', 'extracted-id')
  })
})
