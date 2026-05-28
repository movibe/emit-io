import { EmitIoStrategy, JSONTransport, redact, LogLevelEnum } from 'emit-io-core'

// Redact plugin runs in the pipeline before any transport receives the entry.
// Patterns support exact paths, dot-notation, and wildcards.
const emit = new EmitIoStrategy({
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

emit.info('User login attempt', {
  username: 'alice',
  password: 'hunter2',          // -> '[REDACTED]'
  user: { id: 'u1', token: 'jwt-abc' }, // user.token -> '[REDACTED]'
  headers: { authorization: 'Bearer xyz', 'content-type': 'application/json' },
  creditCard: '4111111111111111', // -> '[REDACTED]'
})
