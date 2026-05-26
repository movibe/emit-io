import { LoggerStrategy, ConsoleProvider, LogLevelEnum } from '@emitio/core'

export const logger = new LoggerStrategy({
  providers: [
    new ConsoleProvider({ minLevel: LogLevelEnum.DEBUG }),
  ],
})
