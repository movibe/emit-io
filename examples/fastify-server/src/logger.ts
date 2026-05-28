import { EmitIoStrategy, JSONTransport, LogLevelEnum, redact } from 'emit-io-core'

export const emit = new EmitIoStrategy({
  transports: [
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', 'token', 'authorization', 'creditCard'] }),
  ],
})
