import {
  LoggerStrategy,
  JSONTransport,
  ConsoleTransport,
  LogLevelEnum,
  redact,
} from '@emit-io/core'

export const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', 'token', 'authorization', '*.secret'] }),
  ],
  emitAppOpenOnInit: false,
})
