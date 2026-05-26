import { LoggerStrategy, JSONTransport, LogLevelEnum, redact } from '@emit/logger'

export const logger = new LoggerStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', 'token', 'authorization', 'creditCard'] }),
  ],
})
