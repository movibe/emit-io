/**
 * Smoke tests for the hono-worker example.
 *
 * Uses Hono's in-process app.request() helper so no real HTTP server is
 * needed. The ExecutionContext is mocked (4th arg) so waitUntil() is a no-op.
 * The global fetch is stubbed to prevent the HTTPTransport from making real
 * network calls to LOG_INGEST_URL during the test run.
 */
import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import app from '../index.js'

const env = {
  LOG_INGEST_URL: 'http://localhost/ingest',
  LOG_INGEST_TOKEN: 'test-token',
}

const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
}

beforeEach(() => {
  // Stub fetch so HTTPTransport does not make real outbound requests.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  )
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hono-worker smoke tests', () => {
  test('GET / returns 200 with ok: true', async () => {
    const res = await app.request(
      '/',
      {},
      env,
      mockCtx as unknown as ExecutionContext,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
    expect(typeof body.message).toBe('string')
    expect(body.requestId).toBeTruthy()
  })

  test('GET /api/data returns 200 with items array', async () => {
    const res = await app.request(
      '/api/data',
      {},
      env,
      mockCtx as unknown as ExecutionContext,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(Array.isArray(body.items)).toBe(true)
    const items = body.items as unknown[]
    expect(items.length).toBeGreaterThan(0)
  })

  test('POST /api/event with valid JSON returns 200 with ok and name', async () => {
    const res = await app.request(
      '/api/event',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-event' }),
      },
      env,
      mockCtx as unknown as ExecutionContext,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
    expect(body.name).toBe('test-event')
  })

  test('POST /api/event with invalid JSON returns 400', async () => {
    const res = await app.request(
      '/api/event',
      {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'not-json',
      },
      env,
      mockCtx as unknown as ExecutionContext,
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(false)
    expect(body.error).toBe('invalid-json')
  })
})
