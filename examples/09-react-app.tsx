import React from 'react'
import { EmitIoStrategy, type AnalyticsProvider } from 'emit-io-core'
import {
  AnalyticsProvider as AnalyticsContext,
  useAnalytics,
  useEventTracking,
  AnalyticsErrorBoundary,
} from 'emit-io-react'

// Create the EmitIoStrategy once at module level — share via context
const consoleProvider: AnalyticsProvider = {
  name: 'console',
  enabled: true,
  event(name, properties) { console.log('[analytics]', name, properties) },
  error(feature, name, critical, err) { console.error('[error]', feature, name, err) },
}

const emit = new EmitIoStrategy({ providers: [consoleProvider] })

// Root — wrap with AnalyticsContext and AnalyticsErrorBoundary
export function App() {
  return (
    <AnalyticsContext client={emit} autoTrack>
      <AnalyticsErrorBoundary
        onError={(err, info) => emit.captureError('App', 'render-error', true, err)}
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
