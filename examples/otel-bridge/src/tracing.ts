/**
 * OpenTelemetry SDK bootstrap.
 *
 * IMPORTANT: This module must be imported BEFORE any application code so that
 * auto-instrumentations can patch Node core / HTTP libraries at require time.
 *
 * Run with:
 *   node --import ./dist/tracing.js dist/index.js
 *
 * The `OTEL_EXPORTER_OTLP_ENDPOINT` env var (default http://localhost:4318)
 * controls where traces and logs are exported.
 */
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { logs } from '@opentelemetry/api-logs'

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'

// --- Traces ---------------------------------------------------------------
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'otel-bridge-example',
  traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()

// --- Logs -----------------------------------------------------------------
// The Logs SDK is separate from NodeSDK; we register a global LoggerProvider
// so `logs.getLoggerProvider()` (used by OTelTransport) resolves to it.
const loggerProvider = new LoggerProvider()
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new OTLPLogExporter({ url: `${endpoint}/v1/logs` })),
)
logs.setGlobalLoggerProvider(loggerProvider)

// --- Graceful shutdown ----------------------------------------------------
const shutdown = async (): Promise<void> => {
  try {
    await sdk.shutdown()
    await loggerProvider.shutdown()
    // eslint-disable-next-line no-console
    console.log('[tracing] OTel SDK shut down cleanly')
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tracing] error during OTel shutdown', err)
  }
}

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0))
})
process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0))
})
process.on('beforeExit', () => {
  void shutdown()
})
