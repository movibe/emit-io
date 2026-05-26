import React from 'react'
import { LoggerStrategy, type AnalyticsProvider } from '@movibe/logger'
import {
  AnalyticsProvider as AnalyticsContext,
  useAnalytics,
  useEventTracking,
  AnalyticsErrorBoundary,
} from '@movibe/logger-react'

// Create the logger once at module level — share via context
const consoleProvider: AnalyticsProvider = {
  name: 'console',
  enabled: true,
  event(name, properties) { console.log('[analytics]', name, properties) },
  error(feature, name, critical, err) { console.error('[error]', feature, name, err) },
}

const logger = new LoggerStrategy({ providers: [consoleProvider] })

// Root — wrap with AnalyticsContext and AnalyticsErrorBoundary
export function App() {
  return (
    <AnalyticsContext client={logger} autoTrack>
      <AnalyticsErrorBoundary
        onError={(err, info) => logger.captureError('App', 'render-error', true, err)}
      >
        <Home />
      </AnalyticsErrorBoundary>
    </AnalyticsContext>
  )
}

// useEventTracking fires on mount, useAnalytics exposes the logger methods
function Home() {
  useEventTracking('home-viewed')
  const { event, captureError } = useAnalytics()

  function handleClick() {
    event('cta-clicked', { location: 'hero' })
  }

  return <button onClick={handleClick}>Get started</button>
}
