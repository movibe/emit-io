import Fastify from 'fastify'
import { loggerPlugin } from '@emit/fastify'
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emit/logger'

const app = Fastify({ disableRequestLogging: true })

const logger = new LoggerStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

// loggerPlugin decorates every request with req.log_ — a child logger
// already bound with method, url, requestId, and response time on completion.
await app.register(loggerPlugin, { logger })

app.get('/users/:id', async (req, reply) => {
  req.log_.info('fetching user', { userId: (req.params as { id: string }).id })

  // Simulate async work
  const user = { id: (req.params as { id: string }).id, name: 'Alice' }
  req.log_.debug('user fetched', { user })

  reply.send(user)
})

app.listen({ port: 3000 }, (err) => {
  if (err) {
    logger.fatal('Failed to start server', { error: err.message })
    process.exit(1)
  }
  logger.info('Server listening', { port: 3000 })
})
