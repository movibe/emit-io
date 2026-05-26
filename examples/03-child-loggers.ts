import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from '@movibe/logger'

// Child loggers inherit all transports and providers from the parent,
// and automatically attach bound fields to every log entry.
const logger = new LoggerStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG })],
})

function handleRequest(requestId: string, userId: string) {
  // Attach requestId to all logs in this function
  const reqLog = logger.child({ requestId })
  reqLog.info('handling request')  // context: { requestId }

  // Nest further — adds component on top of requestId
  const dbLog = reqLog.child({ component: 'db', userId })
  dbLog.debug('query started', { table: 'users' })  // context: { requestId, component, userId }
  dbLog.debug('query done', { rows: 42 })
}

handleRequest('req-abc', 'usr-99')
