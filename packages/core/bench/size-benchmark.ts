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
  const bench = new Bench({ time: 1000 })
  const { LoggerStrategy, LogLevelEnum } = await import('../dist/index.js')

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
    const size = getSize(join(ROOT, 'packages', pkg, 'dist'))
    total += size
    const label = `emit-io-${pkg}`
    console.log(`  ${label.padEnd(22)} ${(size / 1024).toFixed(1)} KB`)
  }
  console.log(`  ${'TOTAL'.padEnd(22)} ${(total / 1024).toFixed(1)} KB`)
}

main()
