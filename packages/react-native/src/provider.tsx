import { useMemo, useEffect } from 'react'
import { AnalyticsReactContext } from './context.js'
import { useAppStateAnalytics } from './app-state.js'
import type { AnalyticsContextValue, AnalyticsProviderProps } from './types.js'

export function AnalyticsProvider({ client, children, trackAppState = true }: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(() => {
    const providers = (client as any).providers ?? []
    return {
      client,
      providers,
      event: (name, properties) => client.event?.(name as any, properties as any),
      screen: (name, params) => client.logScreen?.(name, params),
      identify: (user) => client.setUser?.(user as any),
      captureError: (feature, name, critical, err, extra) =>
        client.captureError?.(feature, name, critical, err, extra),
    }
  }, [client])

  useEffect(() => {
    client.init?.()
  }, [client])

  if (trackAppState) {
    return (
      <AnalyticsReactContext.Provider value={value}>
        <AppStateTracker client={client}>{children}</AppStateTracker>
      </AnalyticsReactContext.Provider>
    )
  }

  return (
    <AnalyticsReactContext.Provider value={value}>
      {children}
    </AnalyticsReactContext.Provider>
  )
}

function AppStateTracker({ client, children }: { client: any; children: React.ReactNode }) {
  useAppStateAnalytics(client)
  return <>{children}</>
}
