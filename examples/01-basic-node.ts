import { LoggerStrategy, ConsoleTransport, JSONTransport, LogLevelEnum } from '@emit/core'

// Two transports in parallel: pretty console for dev, JSON for log aggregators
const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

logger.debug('Starting up', { env: process.env.NODE_ENV })
logger.info('Server started', { port: 3000 })
logger.warn('Connection retry', { attempts: 3 })
logger.error('Database error', { query: 'SELECT *', ms: 5000 })
logger.fatal('Out of memory')

// Flush transports and close gracefully
await logger.close()
