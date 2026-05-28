import { EmitIoStrategy, ConsoleTransport, JSONTransport, LogLevelEnum } from 'emit-io-core'

// Two transports in parallel: pretty console for dev, JSON for log aggregators
const emit = new EmitIoStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
})

emit.debug('Starting up', { env: process.env.NODE_ENV })
emit.info('Server started', { port: 3000 })
emit.warn('Connection retry', { attempts: 3 })
emit.error('Database error', { query: 'SELECT *', ms: 5000 })
emit.fatal('Out of memory')

// Flush transports and close gracefully
await emit.close()
