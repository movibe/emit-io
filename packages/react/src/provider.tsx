'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { AnalyticsReactContext } from './context.js'
import type { AnalyticsContextValue, AnalyticsProviderProps } from './types.js'

export function AnalyticsProvider({ client, children, autoTrack }: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(() => {
    const providers = (client as any).providers ?? []

    return {
      client,
      providers,
      event: (name, properties) => client.event?.(name as any, properties as any),
      screen: (name, params) => client.logScreen?.(name, params),
      identify: (user) => client.setUser?.(user as any),
      error: (feature, name, critical, err, extra) =>
        client.error?.(feature, name, critical, err, extra),
    }
  }, [client])

  useEffect(() => {
    client.init?.()
  }, [client])

  if (autoTrack) {
    return (
      <AnalyticsReactContext.Provider value={value}>
        <AutoPageTracker client={client}>
          {children}
        </AutoPageTracker>
      </AnalyticsReactContext.Provider>
    )
  }

  return (
    <AnalyticsReactContext.Provider value={value}>
      {children}
    </AnalyticsReactContext.Provider>
  )
}

function AutoPageTracker({ client, children }: { client: any; children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const path = window.location.pathname
    client.logScreen?.(path, { url: window.location.href, referrer: document.referrer || undefined })

    const handlePopState = () => {
      const currentPath = window.location.pathname
      client.logScreen?.(currentPath, { url: window.location.href })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [client])

  return <>{children}</>
}
