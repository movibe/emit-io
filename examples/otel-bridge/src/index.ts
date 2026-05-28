/**
 * Entry point.
 *
 * `./tracing.js` is imported FIRST so the OTel SDK is fully initialised
 * before any other module touches the OTel API. When running with
 * `node --import ./dist/tracing.js dist/index.js` the loader hook already
 * runs tracing.js before this file, but the explicit import here keeps
 * the example self-contained when started without the `--import` flag.
 */
import './tracing.js'
import { logger } from './emit.js'

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  emit.info('service starting', { pid: process.pid })

  // Simulate 5 analytics events + accompanying structured logs.
  const orders = [
    { id: 'ord-001', total: 49.9, sku: 'sku-a' },
    { id: 'ord-002', total: 19.0, sku: 'sku-b' },
    { id: 'ord-003', total: 129.5, sku: 'sku-c' },
    { id: 'ord-004', total: 9.99, sku: 'sku-d' },
    { id: 'ord-005', total: 250.0, sku: 'sku-e' },
  ] as const

  for (const order of orders) {
    emit.info('order received', { orderId: order.id, total: order.total })
    emit.event('order.created', {
      orderId: order.id,
      sku: order.sku,
      total: order.total,
    })
    await sleep(50)
  }

  // Simulate one captured error -> OTel span with exception + ERROR log.
  try {
    throw new Error('downstream payment provider timed out')
  } catch (err) {
    emit.captureError('Payments', 'charge_timeout', true, err as Error, {
      orderId: 'ord-005',
      provider: 'stripe',
    })
  }

  emit.info('service finished simulation', { events: orders.length, errors: 1 })

  // Give exporters a moment to flush before process exit.
  await sleep(2000)
}

main().catch((err) => {
  emit.captureError('Bootstrap', 'main_failed', true, err as Error)
  process.exitCode = 1
})
