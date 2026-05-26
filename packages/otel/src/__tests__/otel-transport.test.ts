import { test, expect, describe, vi } from 'vitest'
import { SeverityNumber } from '@opentelemetry/api-logs'
import { OTelTransport } from '../otel-transport.js'
import { LogLevelEnum } from '@movibe/logger'
import type { LogLevel } from '@movibe/logger'

function createMockOtelLogger() {
  return { emit: vi.fn() }
}

function createMockProvider(otelLogger: any) {
  return { getLogger: vi.fn(() => otelLogger) }
}

describe('OTelTransport', () => {
  test('emits with INFO severity', () => {
    const otelLogger = createMockOtelLogger()
    const provider = createMockProvider(otelLogger) as any
    const t = new OTelTransport({ loggerProvider: provider })
    t.log({ level: LogLevelEnum.INFO as LogLevel, message: 'hello', timestamp: new Date() })
    expect(otelLogger.emit).toHaveBeenCalledWith(expect.objectContaining({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: 'hello',
    }))
  })

  test('maps all levels correctly', () => {
    const otelLogger = createMockOtelLogger()
    const provider = createMockProvider(otelLogger) as any
    const t = new OTelTransport({ loggerProvider: provider })
    const cases: Array<[LogLevel, SeverityNumber]> = [
      [LogLevelEnum.DEBUG as LogLevel, SeverityNumber.DEBUG],
      [LogLevelEnum.INFO as LogLevel, SeverityNumber.INFO],
      [LogLevelEnum.WARN as LogLevel, SeverityNumber.WARN],
      [LogLevelEnum.ERROR as LogLevel, SeverityNumber.ERROR],
      [LogLevelEnum.FATAL as LogLevel, SeverityNumber.FATAL],
    ]
    for (const [lvl, sev] of cases) {
      otelLogger.emit.mockClear()
      t.log({ level: lvl, message: 'x', timestamp: new Date() })
      expect(otelLogger.emit).toHaveBeenCalledWith(expect.objectContaining({ severityNumber: sev }))
    }
  })

  test('serializes error fields', () => {
    const otelLogger = createMockOtelLogger()
    const provider = createMockProvider(otelLogger) as any
    const t = new OTelTransport({ loggerProvider: provider })
    const err = new Error('boom')
    t.log({ level: LogLevelEnum.ERROR as LogLevel, message: 'e', timestamp: new Date(), error: err })
    expect(otelLogger.emit).toHaveBeenCalledWith(expect.objectContaining({
      attributes: expect.objectContaining({
        'error.message': 'boom',
        'error.name': 'Error',
      }),
    }))
  })

  test('passes context as attributes', () => {
    const otelLogger = createMockOtelLogger()
    const provider = createMockProvider(otelLogger) as any
    const t = new OTelTransport({ loggerProvider: provider })
    t.log({ level: LogLevelEnum.INFO as LogLevel, message: 'x', timestamp: new Date(), context: { userId: 'u1' } })
    expect(otelLogger.emit).toHaveBeenCalledWith(expect.objectContaining({
      attributes: expect.objectContaining({ userId: 'u1' }),
    }))
  })

  test('timestamp converted to ns', () => {
    const otelLogger = createMockOtelLogger()
    const provider = createMockProvider(otelLogger) as any
    const t = new OTelTransport({ loggerProvider: provider })
    const ts = new Date('2026-01-01T00:00:00.000Z')
    t.log({ level: LogLevelEnum.INFO as LogLevel, message: 'x', timestamp: ts })
    expect(otelLogger.emit).toHaveBeenCalledWith(expect.objectContaining({
      timestamp: ts.getTime() * 1_000_000,
    }))
  })
})
