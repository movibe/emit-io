import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { type EmitIoStrategy } from 'emit-io-core'
import { randomUUID } from 'node:crypto'

declare module 'fastify' {
  interface FastifyRequest {
    log_: EmitIoStrategy
    requestId: string
  }
}

export interface LoggerPluginOptions {
  logger: EmitIoStrategy
  /** Header name for request id (default 'x-request-id') */
  requestIdHeader?: string
  /** Auto log request start/end (default true) */
  autoLog?: boolean
}

const pluginImpl: FastifyPluginAsync<LoggerPluginOptions> = async (fastify, opts) => {
  const headerName = opts.requestIdHeader ?? 'x-request-id'
  const autoLog = opts.autoLog ?? true
  const baseLogger = opts.logger

  fastify.decorateRequest('log_', null as any)
  fastify.decorateRequest('requestId', '')

  fastify.addHook('onRequest', async (req, reply) => {
    const requestId = (req.headers[headerName] as string | undefined) ?? randomUUID()
    req.requestId = requestId
    req.log_ = baseLogger.child({ requestId, method: req.method, path: req.url })
    reply.header(headerName, requestId)
    ;(req as any).__start = Date.now()
    if (autoLog) {
      req.log_.info('request-start', { method: req.method, path: req.url })
    }
  })

  fastify.addHook('onResponse', async (req, reply) => {
    if (!autoLog) return
    const start = (req as any).__start as number
    req.log_.info('request-complete', {
      status: reply.statusCode,
      durationMs: Date.now() - start,
    })
  })

  fastify.addHook('onError', async (req, _reply, err) => {
    req.log_.error('request-failed', {
      method: req.method,
      path: req.url,
      error: err.message,
    })
  })
}

export const loggerPlugin = fp<LoggerPluginOptions>(pluginImpl, {
  name: 'emit-io-fastify',
  fastify: '4.x || 5.x',
})
