import { LoggerStrategy, JSONTransport, redact, LogLevelEnum } from '@emit/core'

// Redact plugin runs in the pipeline before any transport receives the entry.
// Patterns support exact paths, dot-notation, and wildcards.
const logger = new LoggerStrategy({
  transports: [new JSONTransport({ minLevel: LogLevelEnum.INFO })],
  plugins: [
    redact({
      paths: [
        'password',
        'user.token',
        '*.secret',
        'headers.authorization',
        'creditCard',
      ],
      censor: '[REDACTED]',
    }),
  ],
})

logger.info('User login attempt', {
  username: 'alice',
  password: 'hunter2',          // -> '[REDACTED]'
  user: { id: 'u1', token: 'jwt-abc' }, // user.token -> '[REDACTED]'
  headers: { authorization: 'Bearer xyz', 'content-type': 'application/json' },
  creditCard: '4111111111111111', // -> '[REDACTED]'
})
