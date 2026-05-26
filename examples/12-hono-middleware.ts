import { Hono } from 'hono'
import { loggerMiddleware } from '@emitio/hono'
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '@emitio/core'

const logger = new LoggerStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

const app = new Hono()

// loggerMiddleware attaches a child logger to the context for each request.
// Access it via c.get('logger') in route handlers.
app.use('*', loggerMiddleware({ logger }))

app.get('/', (c) => {
  const log = c.get('logger' as any)
  log.info('home request handled')
  return c.text('hello')
})

app.get('/items/:id', (c) => {
  const log = c.get('logger' as any)
  log.info('fetching item', { itemId: c.req.param('id') })
  return c.json({ id: c.req.param('id'), name: 'Widget' })
})

export default app
