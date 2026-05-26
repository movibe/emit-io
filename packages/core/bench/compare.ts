import { Bench } from 'tinybench'
import { LoggerStrategy, JSONTransport, LogLevelEnum } from '../src/index.js'
import pino from 'pino'
import winston from 'winston'
import { createWriteStream } from 'node:fs'
import { devNull } from 'node:os'

const devNullStream = createWriteStream(devNull)

const movibeLogger = new LoggerStrategy({
  transports: [new JSONTransport({
    minLevel: LogLevelEnum.INFO,
    write: (line) => devNullStream.write(line),
  })],
  emitAppOpenOnInit: false,
})

const pinoLogger = pino(devNullStream)

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Stream({ stream: devNullStream })],
})

async function main() {
  const benchSimple = new Bench({ time: 1000 })
  benchSimple
    .add('@movibe/logger info', () => {
      movibeLogger.info('hello world')
    })
    .add('pino info', () => {
      pinoLogger.info('hello world')
    })
    .add('winston info', () => {
      winstonLogger.info('hello world')
    })

  await benchSimple.run()
  console.log('\n=== Simple info ===')
  console.table(benchSimple.table())

  const benchCtx = new Bench({ time: 1000 })
  benchCtx
    .add('@movibe/logger info+ctx', () => {
      movibeLogger.info('hello', { userId: 'abc', requestId: 'xyz', count: 42 })
    })
    .add('pino info+ctx', () => {
      pinoLogger.info({ userId: 'abc', requestId: 'xyz', count: 42 }, 'hello')
    })
    .add('winston info+ctx', () => {
      winstonLogger.info('hello', { userId: 'abc', requestId: 'xyz', count: 42 })
    })

  await benchCtx.run()
  console.log('\n=== info + context ===')
  console.table(benchCtx.table())

  const benchChild = new Bench({ time: 1000 })
  const movibeChild = movibeLogger.child({ requestId: 'abc' })
  const pinoChild = pinoLogger.child({ requestId: 'abc' })
  const winstonChild = winstonLogger.child({ requestId: 'abc' })

  benchChild
    .add('@movibe/logger child info', () => {
      movibeChild.info('hello')
    })
    .add('pino child info', () => {
      pinoChild.info('hello')
    })
    .add('winston child info', () => {
      winstonChild.info('hello')
    })

  await benchChild.run()
  console.log('\n=== child + info ===')
  console.table(benchChild.table())
}

main().catch((e) => { console.error(e); process.exit(1) })
