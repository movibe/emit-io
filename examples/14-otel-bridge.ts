// Assumes OTel SDK is initialized by your application before this module loads.
// See https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/
import { LoggerStrategy } from '@emitio/core'
import { OTelProvider, OTelTransport } from '@emitio/otel'

// OTelProvider maps analytics calls to OTel spans.
// OTelTransport maps log-level entries to OTel logs.
const logger = new LoggerStrategy({
  providers: [new OTelProvider()],
  transports: [new OTelTransport()],
})

// Analytics event -> OTel span named "analytics.checkout-started"
logger.event('checkout-started', { sku: 'item-abc', amount: 99 })

// captureError -> OTel span with error attributes + log with severity ERROR
logger.captureError('Payment', 'charge-failed', true, new Error('card declined'))

// Log-level calls -> OTel log records with matching severity
logger.info('Order processed', { orderId: 'ord-1' })
logger.error('DB timeout', { table: 'orders', ms: 5000 })
