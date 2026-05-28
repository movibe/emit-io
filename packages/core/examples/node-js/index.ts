import { EmitIoStrategy, ConsoleTransport, ConsoleProvider, LogLevelEnum } from '../../src/index.js'
import type { Plugin } from '../../src/types.js'

// --- v2 API: NewEmitIoStrategyConfig constructor ---

const redactSecrets: Plugin = (entry) => {
  if (entry.context?.password) {
    return { ...entry, context: { ...entry.context, password: '***' } }
  }
  return entry
}

const filterNoise: Plugin = (entry) =>
  entry.message.includes('/healthz') ? null : entry

const emit = new EmitIoStrategy({
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

emit.init()

// LogLevel-based logging (v2)
emit.debug('Connecting to database...', { host: 'localhost', port: 5432 })
emit.info('Server started on port 3000')
emit.warn('Deprecated API called', { endpoint: '/api/v1', suggested: '/api/v2' })
emit.error('Connection pool exhausted', { poolSize: 10, active: 10 })
emit.fatal('Database unreachable', { retryCount: 3 })

// Analytics events (legacy + v2)
emit.event('user-login', { method: 'google' })

// User tracking
emit.setUser({
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
})

// Screen tracking
emit.logScreen('DashboardScreen', { referrer: 'LoginScreen' })

// Error tracking
try {
  throw new Error('Failed to fetch user profile')
} catch (err) {
  emit.error('UserService', 'fetch-profile-failed', true, err, { userId: 'user-123' })
}

emit.flush()
