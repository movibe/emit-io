import { type FastifyInstance } from 'fastify'

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    req.log_.info('get user', { userId: id })

    const user = { id, name: 'Alice', email: 'alice@example.com' }
    req.log_.debug('user found', { user })

    return reply.send(user)
  })
}
