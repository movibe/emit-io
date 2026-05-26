import { Bench } from 'tinybench'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

function getSize(dir: string): number {
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
  const bench = new Bench({ time: 1000 })
  const { LoggerStrategy, ConsoleTransport, LogLevelEnum } = await import('../dist/index.js')

  const noopTransport = {
    name: 'noop',
    minLevel: LogLevelEnum.DEBUG,
    log: () => {},
  }

  const logger = new LoggerStrategy({
    transports: [noopTransport],
    emitAppOpenOnInit: false,
  })

  bench
    .add('info no context', () => logger.info('hello'))
    .add('info with context', () => logger.info('hello', { userId: 'abc', requestId: 'xyz' }))
    .add('error with stack', () => logger.error('boom', { err: new Error('x').stack }))
    .add('event analytics noop', () => logger.event('user-login', { method: 'email' }))

  await bench.run()

  console.log('\n=== BENCHMARK DE PERFORMANCE ===')
  console.table(bench.table())

  console.log('\n=== TAMANHO DOS PACOTES (apenas .js/.cjs) ===')
  const pkgs = ['core', 'react', 'react-native', 'next', 'fastify', 'hono', 'otel', 'codegen']
  let total = 0
  for (const pkg of pkgs) {
    const size = getSize(`packages/${pkg}/dist`)
    total += size
    console.log(`  emit-io-${pkg.padEnd(13)} ${(size / 1024).toFixed(1)} KB`)
  }
  console.log(`  ${'TOTAL'.padStart(18)} ${(total / 1024).toFixed(1)} KB`)
}

main()
