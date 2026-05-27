import {
  LoggerStrategy,
  ConsoleTransport,
  ConsoleProvider,
  LogLevelEnum,
} from 'emit-io-core'

/**
 * Browser-safe LoggerStrategy.
 *
 * - ConsoleTransport: structured log entries (debug/info/warn/error/fatal).
 * - ConsoleProvider: analytics events / screen views / identify / captureError.
 *
 * Neither touches Node-only APIs, so this is safe to run in the browser.
 */
export const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
  ],
  providers: [
    new ConsoleProvider({ prefix: '[analytics]' }),
  ],
})
