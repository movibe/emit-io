/**
 * LoggerStrategy wired with:
 *   - ConsoleTransport  -> human-readable stdout output
 *   - OTelTransport     -> bridges log entries to the OTel Logs API
 *   - OTelProvider      -> bridges analytics events to OTel spans
 *
 * Must be imported AFTER ./tracing.js so that `trace.getTracer` and
 * `logs.getLoggerProvider` resolve to the SDK-backed providers.
 */
import { ConsoleTransport, LoggerStrategy, LogLevelEnum } from '@emitio/core'
import { OTelProvider, OTelTransport } from '@emitio/otel'

export const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new OTelTransport({
      minLevel: LogLevelEnum.INFO,
      loggerName: 'otel-bridge-example',
    }),
  ],
  providers: [
    new OTelProvider({
      tracerName: 'otel-bridge-example',
    }),
  ],
})
