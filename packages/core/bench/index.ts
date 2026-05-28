import { Bench } from 'tinybench'
import { EmitIoStrategy, ConsoleTransport, LogLevelEnum } from '../src/index.js'

async function main() {
  const bench = new Bench({ time: 1000 })

  const noopTransport = {
    name: 'noop',
    minLevel: LogLevelEnum.DEBUG,
    log: () => {},
  }

  const emit = new EmitIoStrategy({
    transports: [noopTransport],
    emitAppOpenOnInit: false,
  })

  bench
    .add('info no context', () => {
      emit.info('hello')
    })
    .add('info with context', () => {
      emit.info('hello', { userId: 'abc', requestId: 'xyz' })
    })
    .add('error with stack', () => {
      emit.error('boom', { err: new Error('x').stack })
    })
    .add('event analytics noop', () => {
      emit.event('user-login', { method: 'email' })
    })

  await bench.run()
  console.table(bench.table())
}

main()
