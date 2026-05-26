import { LoggerStrategy, ConsoleTransport, runWithContext, LogLevelEnum } from '@emit-io/core'

// runWithContext uses AsyncLocalStorage to propagate context across await
// boundaries without passing it manually through every function signature.
const logger = new LoggerStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG })],
})

async function processRequest(traceId: string, requestId: string) {
  await runWithContext({ traceId, requestId }, async () => {
    logger.info('request started')    // context: { traceId, requestId }

    await fetchUser('usr-1')          // context flows into nested calls automatically
    await writeAuditLog()

    logger.info('request complete')   // context: { traceId, requestId }
  })
}

async function fetchUser(id: string) {
  // No manual context passing needed — ALS provides it
  logger.debug('fetching user', { id })
}

async function writeAuditLog() {
  logger.debug('writing audit log')
}

await processRequest('trace-xyz', 'req-001')
