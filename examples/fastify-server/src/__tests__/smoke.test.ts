import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { EmitIoStrategy } from 'emit-io-core'
import { createMockTransport } from '../../../../packages/core/src/test-utils.js'
import { buildApp } from '../server.js'

describe('fastify-server smoke', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let transport: ReturnType<typeof createMockTransport>

  beforeEach(async () => {
    transport = createMockTransport()
    const emit = new EmitIoStrategy({ transports: [transport] })
    app = await buildApp(emit)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  test('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok' })
  })

  test('GET /users/:id returns user', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/42' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: '42' })
  })

  test('POST /login missing body returns 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/login' })
    expect(res.statusCode).toBe(400)
  })

  test('POST /login with credentials returns token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: { username: 'alice', password: 'secret' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ token: expect.any(String) })
  })

  test('response has x-request-id header', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['x-request-id']).toBeDefined()
  })

  test('redact: password not logged in plaintext', async () => {
    await app.inject({
      method: 'POST',
      url: '/login',
      payload: { username: 'alice', password: 'supersecret' },
    })
    const logged = JSON.stringify(transport.entries)
    expect(logged).not.toContain('supersecret')
  })
})
