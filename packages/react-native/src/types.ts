import type { AnalyticsProvider, EmitIoStrategy } from 'emit-io-core'
import type { ReactNode } from 'react'

export type AnalyticsContextValue = {
  client: EmitIoStrategy
  providers: AnalyticsProvider[]
  event: (name: string, properties?: Record<string, unknown>) => void
  screen: (name: string, params?: Record<string, unknown>) => void
  identify: (user: { id: string; [key: string]: unknown }) => void
  captureError: (
    feature: string,
    name: string,
    critical: boolean,
    err: Error,
    extra?: Record<string, unknown>,
  ) => void
}

export type AnalyticsProviderProps = {
  client: EmitIoStrategy
  children: ReactNode
  /** Auto-track AppState transitions (foreground/background) — default true */
  trackAppState?: boolean
}
