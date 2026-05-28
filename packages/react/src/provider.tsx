'use client'

import { useEffect, useMemo } from 'react'
import { AnalyticsReactContext } from './context.js'
import type { AnalyticsContextValue, AnalyticsProviderProps } from './types.js'

export function AnalyticsProvider({ client, children, autoTrack }: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(() => {
    // `client` is typed as AnyStrategy (EmitIoStrategy<any,...,any>), so private fields
    // like `providers` are not directly accessible — fall back to an empty array.
    const providers =
      (client as unknown as { providers?: AnalyticsContextValue['providers'] }).providers ?? []

    return {
      client,
      providers,
      event: (name, properties) => client.event?.(name, properties),
      screen: (name, params) => client.logScreen?.(name, params),
      identify: (user) => client.setUser?.(user),
      captureError: (feature, name, critical, err, extra) =>
        client.captureError?.(feature, name, critical, err, extra),
      error: (feature, name, critical, err, extra) =>
        client.captureError?.(feature, name, critical, err, extra),
    }
  }, [client])

  useEffect(() => {
    client.init?.()
  }, [client])

  if (autoTrack) {
    return (
      <AnalyticsReactContext.Provider value={value}>
        <AutoPageTracker client={client}>{children}</AutoPageTracker>
      </AnalyticsReactContext.Provider>
    )
  }

  return <AnalyticsReactContext.Provider value={value}>{children}</AnalyticsReactContext.Provider>
}

function AutoPageTracker({
  client,
  children,
}: {
  client: AnalyticsProviderProps['client']
  children: React.ReactNode
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const path = window.location.pathname
    client.logScreen?.(path, {
      url: window.location.href,
      referrer: document.referrer || undefined,
    })

    const handlePopState = () => {
      const currentPath = window.location.pathname
      client.logScreen?.(currentPath, { url: window.location.href })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [client])

  return <>{children}</>
}
