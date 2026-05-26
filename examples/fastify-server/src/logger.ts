import { LoggerStrategy, JSONTransport, LogLevelEnum, redact } from '@movibe/logger'

export const logger = new LoggerStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', 'token', 'authorization', 'creditCard'] }),
  ],
})
