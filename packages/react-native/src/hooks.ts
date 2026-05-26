import { useContext, useCallback, useEffect, useRef } from 'react'
import { AnalyticsReactContext } from './context.js'
import type { AnalyticsContextValue } from './types.js'

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsReactContext)
  if (!ctx) {
    throw new Error(
      'useAnalytics() must be used within an <AnalyticsProvider>. ' +
      'Wrap your component tree with <AnalyticsProvider client={logger}> first.'
    )
  }
  return ctx
}

export interface TrackEventOptions {
  properties?: Record<string, unknown>
  once?: boolean
  unless?: boolean
}

export function useEventTracking(eventName: string, options?: TrackEventOptions): void {
  const analytics = useAnalytics()
  const hasFired = useRef(false)

  useEffect(() => {
    if (options?.unless) return
    if (options?.once && hasFired.current) return
    analytics.event(eventName, options?.properties)
    hasFired.current = true
  }, [eventName, analytics, options?.once, options?.unless, options?.properties])
}

export function useScreenTracking(screenName: string, params?: Record<string, unknown>): void {
  const analytics = useAnalytics()
  useEffect(() => {
    analytics.screen(screenName, params)
  }, [screenName, analytics, params])
}

export function useIdentify(): (user: { id: string; [key: string]: unknown }) => void {
  const analytics = useAnalytics()
  return useCallback(
    (user) => analytics.identify(user),
    [analytics]
  )
}

export function useTrackEvent(): (eventName: string, properties?: Record<string, unknown>) => void {
  const analytics = useAnalytics()
  return useCallback(
    (eventName, properties) => analytics.event(eventName, properties),
    [analytics]
  )
}

export function useCaptureError(): (feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>) => void {
  const analytics = useAnalytics()
  return useCallback(
    (feature, name, critical, err, extra) => analytics.captureError(feature, name, critical, err, extra),
    [analytics]
  )
}
