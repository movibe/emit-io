import Fastify from 'fastify'
import { loggerPlugin } from 'emit-io-fastify'
import { EmitIoStrategy, redact } from 'emit-io-core'
import { emit } from './logger.js'
import { userRoutes } from './routes/users.js'
import { fileURLToPath } from 'url'

export async function buildApp(customLogger?: InstanceType<typeof EmitIoStrategy>) {
  const logger = customLogger ?? emit
  if (customLogger) {
    customLogger.addPlugin(redact({ paths: ['password', 'token', 'authorization', 'creditCard'] }))
  }
  const app = Fastify({ disableRequestLogging: true })
  await app.register(loggerPlugin, { logger })
  await app.register(userRoutes)

  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', uptime: process.uptime() })
  })

  app.post('/login', async (req, reply) => {
    const body = (req.body ?? {}) as { username?: string; password?: string }
    const { username, password } = body

    req.log_.info('login attempt', { username })

    if (!username || !password) {
      req.log_.warn('login missing fields', { username: !!username, password: !!password })
      return reply.status(400).send({ error: 'username and password required' })
    }

    // password is automatically redacted by the redact plugin
    req.log_.info('login success', { username, password })

    return reply.send({ token: 'jwt-placeholder' })
  })

  return app
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await buildApp()
  try {
    await app.listen({ port: 3000 })
    emit.info('server started', { port: 3000 })
  } catch (err) {
    emit.fatal('server failed', { error: (err as Error).message })
    process.exit(1)
  }
}
