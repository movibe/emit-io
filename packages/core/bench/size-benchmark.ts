import { Bench } from 'tinybench'
import { readdirSync, statSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../../..')

function getSize(dir: string): number {
  if (!existsSync(dir)) return 0
  let total = 0
  for (const file of readdirSync(dir, { recursive: true })) {
    const path = join(dir, file as string)
    const s = statSync(path)
    if (s.isFile() && (path.endsWith('.js') || path.endsWith('.cjs'))) {
      total += s.size
    }
  }
  return total
}

async function main() {
  const { EmitIoStrategy, LogLevelEnum } = await import('../dist/index.js')
  const pino = (await import('pino')).default
  const winston = await import('winston')

  // emit-io-core — noop transport
  const emitIoLogger = new EmitIoStrategy({
    transports: [{ name: 'noop', minLevel: LogLevelEnum.DEBUG, log: () => {} }],
    emitAppOpenOnInit: false,
  })

  // null stream — discards all output, used for fair benchmarking
  const { Writable } = await import('stream')
  const nullStream = new Writable({ write(_chunk, _enc, cb) { cb() } })

  // pino — write to null stream
  const pinoLogger = pino({ level: 'debug' }, nullStream)

  // winston — write to null stream
  const winstonLogger = winston.createLogger({
    level: 'debug',
    transports: [new winston.transports.Stream({ stream: nullStream })],
  })

  const bench = new Bench({ time: 1000 })

  bench
    .add('emit-io  info no context', () => emitIoLogger.info('hello'))
    .add('emit-io  info with context', () => emitIoLogger.info('hello', { userId: 'abc', requestId: 'xyz' }))
    .add('emit-io  error', () => emitIoLogger.error('boom', { err: 'stack trace here' }))
    .add('pino     info no context', () => pinoLogger.info('hello'))
    .add('pino     info with context', () => pinoLogger.info({ userId: 'abc', requestId: 'xyz' }, 'hello'))
    .add('pino     error', () => pinoLogger.error('boom'))
    .add('winston  info no context', () => winstonLogger.info('hello'))
    .add('winston  info with context', () => winstonLogger.info('hello', { userId: 'abc', requestId: 'xyz' }))
    .add('winston  error', () => winstonLogger.error('boom'))

  await bench.run()

  console.log('\n=== BENCHMARK DE PERFORMANCE (ops/s — maior é melhor) ===')
  console.table(bench.table())

  // ratio comparison: emit-io vs pino vs winston
  const get = (name: string) => bench.tasks.find(t => t.name === name)?.result?.throughput.mean ?? 0
  const emitIoBase = get('emit-io  info no context')
  const pinoBase   = get('pino     info no context')
  const winstonBase = get('winston  info no context')
  console.log('\n=== COMPARAÇÃO (info no context) ===')
  console.log(`  emit-io  ${Math.round(emitIoBase / 1e6)}M ops/s  (baseline)`)
  console.log(`  pino     ${Math.round(pinoBase / 1e6)}M ops/s  (${(emitIoBase / pinoBase).toFixed(1)}x mais lento)`)
  console.log(`  winston  ${Math.round(winstonBase / 1e6)}M ops/s  (${(emitIoBase / winstonBase).toFixed(1)}x mais lento)`)

  console.log('\n=== TAMANHO DOS PACOTES (apenas .js/.cjs) ===')
  const pkgs = ['core', 'react', 'react-native', 'next', 'fastify', 'hono', 'otel', 'codegen']
  let total = 0
  for (const pkg of pkgs) {
    const size = getSize(join(ROOT, 'packages', pkg, 'dist'))
    total += size
    const label = `emit-io-${pkg}`
    console.log(`  ${label.padEnd(22)} ${(size / 1024).toFixed(1)} KB`)
  }
  console.log(`  ${'TOTAL'.padEnd(22)} ${(total / 1024).toFixed(1)} KB`)
}

main()
