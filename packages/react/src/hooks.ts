'use client'

import type { RegisteredEvents } from 'emit-io-core'
import { useCallback, useContext, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { AnalyticsReactContext } from './context.js'
import type { AnalyticsContextValue } from './types.js'

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsReactContext)
  if (!ctx) {
    throw new Error(
      'useAnalytics() must be used within an <AnalyticsProvider>. ' +
        'Wrap your component tree with <AnalyticsProvider client={emit}> first.',
    )
  }
  return ctx
}

export type TrackEventOptions<K extends keyof RegisteredEvents = keyof RegisteredEvents> = {
  /** Properties to send with the event */
  properties?: RegisteredEvents[K]
  /** Only fire once per session (uses a ref) */
  once?: boolean
  /** Skip tracking when condition is true */
  unless?: boolean
}

export function useEventTracking<K extends keyof RegisteredEvents>(
  eventName: K,
  options?: TrackEventOptions<K>,
) {
  const analytics = useAnalytics()
  const hasFired = useRef(false)

  useEffect(() => {
    if (options?.unless) return
    if (options?.once && hasFired.current) return

    analytics.event(eventName, options?.properties)
    hasFired.current = true
  }, [eventName, analytics, options?.once, options?.unless, options?.properties])
}

export function usePageTracking(pageName?: string) {
  const analytics = useAnalytics()

  useEffect(() => {
    const path = pageName ?? (typeof window !== 'undefined' ? window.location.pathname : 'unknown')
    analytics.screen(path, {
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  }, [pageName, analytics])
}

export function useIdentify() {
  const analytics = useAnalytics()

  return useCallback(
    (user: { id: string; [key: string]: unknown }) => {
      analytics.identify(user)
    },
    [analytics],
  )
}

export function useTrackEvent() {
  const analytics = useAnalytics()

  return useCallback(
    <K extends keyof RegisteredEvents>(eventName: K, properties?: RegisteredEvents[K]) => {
      analytics.event(eventName, properties)
    },
    [analytics],
  )
}

/**
 * useFormAnalytics — tracks form submission lifecycle via React 19's useFormStatus.
 *
 * REQUIRES React 19 (react-dom >=19). In React 18, useFormStatus is not available
 * and this hook will throw at import time. Do not use in React 18 projects.
 *
 * Must be rendered inside a child component of a <form action={...}> element.
 *
 * @param formName - Identifier for the form, included in tracked events.
 * @returns { pending: boolean } — mirrors useFormStatus().pending
 */
export function useFormAnalytics(formName: string): { pending: boolean } {
  const status = useFormStatus()
  const analytics = useAnalytics()
  const prevPending = useRef(false)

  useEffect(() => {
    if (status.pending && !prevPending.current) {
      analytics.event('form-submit-start' as any, { form: formName } as any)
    } else if (!status.pending && prevPending.current) {
      analytics.event('form-submit-complete' as any, { form: formName } as any)
    }
    prevPending.current = status.pending
  }, [status.pending, formName, analytics])

  return { pending: status.pending }
}
