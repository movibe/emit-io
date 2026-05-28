import Fastify from 'fastify'
import { loggerPlugin } from 'emit-io-fastify'
import { logger } from './emit.js'
import { userRoutes } from './routes/users.js'

const app = Fastify({ disableRequestLogging: true })

await app.register(loggerPlugin, { logger })
await app.register(userRoutes)

app.get('/health', async (_req, reply) => {
  return reply.send({ status: 'ok', uptime: process.uptime() })
})

app.post('/login', async (req, reply) => {
  const { username, password } = req.body as { username?: string; password?: string }

  req.log_.info('login attempt', { username })

  if (!username || !password) {
    req.log_.warn('login missing fields', { username: !!username, password: !!password })
    return reply.status(400).send({ error: 'username and password required' })
  }

  // password is automatically redacted by the redact plugin
  req.log_.info('login success', { username, password })

  return reply.send({ token: 'jwt-placeholder' })
})

try {
  await app.listen({ port: 3000 })
  emit.info('server started', { port: 3000 })
} catch (err) {
  emit.fatal('server failed', { error: (err as Error).message })
  process.exit(1)
}
