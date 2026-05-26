import { Bench } from 'tinybench'
import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from '../src/index.js'

async function main() {
  const bench = new Bench({ time: 1000 })

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
    .add('info no context', () => {
      logger.info('hello')
    })
    .add('info with context', () => {
      logger.info('hello', { userId: 'abc', requestId: 'xyz' })
    })
    .add('error with stack', () => {
      logger.error('boom', { err: new Error('x').stack })
    })
    .add('event analytics noop', () => {
      logger.event('user-login', { method: 'email' })
    })

  await bench.run()
  console.table(bench.table())
}

main()
