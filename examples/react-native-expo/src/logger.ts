import { LoggerStrategy, ConsoleProvider, LogLevelEnum } from '@movibe/logger'

export const logger = new LoggerStrategy({
  providers: [
    new ConsoleProvider({ minLevel: LogLevelEnum.DEBUG }),
  ],
})
