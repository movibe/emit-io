import { EmitIoStrategy, ConsoleProvider, LogLevelEnum } from 'emit-io-core'

export const emit = new EmitIoStrategy({
  providers: [
    new ConsoleProvider({ minLevel: LogLevelEnum.DEBUG }),
  ],
})
