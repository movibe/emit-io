import { LoggerStrategy, ConsoleProvider, LogLevelEnum } from '@emit/core'

export const logger = new LoggerStrategy({
  providers: [
    new ConsoleProvider({ minLevel: LogLevelEnum.DEBUG }),
  ],
})
