import { LoggerStrategy, ConsoleTransport, ConsoleProvider, LogLevelEnum } from '../../src/index.js'
import type { Plugin } from '../../src/types.js'

// --- v2 API: New LoggerConfig constructor ---

const redactSecrets: Plugin = (entry) => {
  if (entry.context?.password) {
    return { ...entry, context: { ...entry.context, password: '***' } }
  }
  return entry
}

const filterNoise: Plugin = (entry) =>
  entry.message.includes('/healthz') ? null : entry

const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
  ],
  providers: [
    new ConsoleProvider({ name: 'analytics', enabled: true }),
  ],
  plugins: [
    redactSecrets,
    filterNoise,
  ],
  emitAppOpenOnInit: false,
})

logger.init()

// LogLevel-based logging (v2)
logger.debug('Connecting to database...', { host: 'localhost', port: 5432 })
logger.info('Server started on port 3000')
logger.warn('Deprecated API called', { endpoint: '/api/v1', suggested: '/api/v2' })
logger.error('Connection pool exhausted', { poolSize: 10, active: 10 })
logger.fatal('Database unreachable', { retryCount: 3 })

// Analytics events (legacy + v2)
logger.event('user-login', { method: 'google' })

// User tracking
logger.setUser({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
})

// Screen tracking
logger.logScreen('DashboardScreen', { referrer: 'LoginScreen' })

// Error tracking
try {
  throw new Error('Failed to fetch user profile')
} catch (err) {
  logger.error('UserService', 'fetch-profile-failed', true, err, { userId: 'user-123' })
}

logger.flush()
