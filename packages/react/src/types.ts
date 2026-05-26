import type { LoggerStrategy, AnalyticsProvider } from 'emit-io-core'

export interface AnalyticsContextValue {
  client: LoggerStrategy
  /** Direct access to the underlying providers, if needed */
  providers: AnalyticsProvider[]
  /** Track a custom event */
  event: (name: string, properties?: Record<string, unknown>) => void
  /** Track a screen view */
  screen: (name: string, params?: Record<string, unknown>) => void
  /** Identify a user */
  identify: (user: { id: string; [key: string]: unknown }) => void
  /** Track an analytics error with provider dispatch */
  captureError: (feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>) => void
  /** @deprecated use captureError */
  error: (feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>) => void
}

export interface AnalyticsProviderProps {
  client: LoggerStrategy
  children: React.ReactNode
  /** Automatically track page views on navigation changes */
  autoTrack?: boolean
}


