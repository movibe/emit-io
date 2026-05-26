import { LoggerStrategy, ConsoleProvider, LogLevelEnum } from '@emit/logger'

export const logger = new LoggerStrategy({
  providers: [
    new ConsoleProvider({ minLevel: LogLevelEnum.DEBUG }),
  ],
})
