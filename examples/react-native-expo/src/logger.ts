import { EmitIoStrategy, ConsoleTransport, ConsoleProvider, LogLevelEnum } from 'emit-io-core'

export const emit = new EmitIoStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG }),
  ],
  providers: [
    new ConsoleProvider(),
  ],
})
