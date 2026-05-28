import { EmitIoStrategy, HTTPTransport, ConsoleTransport, LogLevelEnum } from 'emit-io-core'

// HTTPTransport batches entries and flushes them on an interval or when
// the batch size is reached. On process shutdown, call close() to drain.
const emit = new EmitIoStrategy({
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

emit.info('Service ready', { version: '3.0.0' })
emit.warn('High memory usage', { heapMb: 512 })

// Graceful shutdown — drain the HTTP batch before the process exits
process.on('SIGTERM', async () => {
  await emit.close()
  process.exit(0)
})
