import { LoggerStrategy, HTTPTransport, ConsoleTransport, LogLevelEnum } from '@emit/logger'

// HTTPTransport batches entries and flushes them on an interval or when
// the batch size is reached. On process shutdown, call close() to drain.
const logger = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new HTTPTransport({
      url: 'https://logs.example.com/ingest',
      minLevel: LogLevelEnum.INFO,
      batchSize: 50,
      flushIntervalMs: 5_000,
      maxRetries: 3,
      headers: {
        Authorization: `Bearer ${process.env.LOG_TOKEN}`,
        'X-Source': 'my-service',
      },
    }),
  ],
})

logger.info('Service ready', { version: '3.0.0' })
logger.warn('High memory usage', { heapMb: 512 })

// Graceful shutdown — drain the HTTP batch before the process exits
process.on('SIGTERM', async () => {
  await logger.close()
  process.exit(0)
})
