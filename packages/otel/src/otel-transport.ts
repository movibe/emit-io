import { logs, type LoggerProvider, SeverityNumber } from '@opentelemetry/api-logs'
import type { LogEntry, Transport, LogLevel } from '@movibe/logger'
import { LogLevelEnum } from '@movibe/logger'

function getSeverityMap(): Record<number, SeverityNumber> {
  return {
    [LogLevelEnum.DEBUG]: SeverityNumber.DEBUG,
    [LogLevelEnum.INFO]: SeverityNumber.INFO,
    [LogLevelEnum.WARN]: SeverityNumber.WARN,
    [LogLevelEnum.ERROR]: SeverityNumber.ERROR,
    [LogLevelEnum.FATAL]: SeverityNumber.FATAL,
  }
}

export interface OTelTransportOptions {
  name?: string
  minLevel?: LogLevel
  loggerName?: string
  loggerProvider?: LoggerProvider
}

export class OTelTransport implements Transport {
  readonly name: string
  readonly minLevel: LogLevel
  private otelLogger: ReturnType<LoggerProvider['getLogger']>

  constructor(opts?: OTelTransportOptions) {
    this.name = opts?.name ?? 'otel'
    this.minLevel = (opts?.minLevel ?? LogLevelEnum.DEBUG) as LogLevel
    const provider = opts?.loggerProvider ?? logs.getLoggerProvider()
    this.otelLogger = provider.getLogger(opts?.loggerName ?? '@movibe/logger-otel', '1.0.0')
  }

  log(entry: LogEntry): void {
    this.otelLogger.emit({
      severityNumber: getSeverityMap()[entry.level],
      severityText: LogLevelEnum[entry.level as number],
      body: entry.message,
      timestamp: entry.timestamp.getTime() * 1_000_000, // ns
      attributes: {
        ...(entry.context as Record<string, any> | undefined),
        ...(entry.error ? {
          'error.message': entry.error.message,
          'error.stack': entry.error.stack ?? '',
          'error.name': entry.error.name,
        } : {}),
      },
    })
  }

  flush(): void {}
}
