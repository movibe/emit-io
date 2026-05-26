import { logger } from '../lib/logger.js'

export default async function HomePage() {
  logger.info('rendering HomePage (RSC)')

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>@emitio/next example</h1>
      <p>Middleware emits request logs with auto requestId + pageview events.</p>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>
          <a href="/api/users/42">GET /api/users/42</a>
        </li>
      </ul>
    </main>
  )
}
