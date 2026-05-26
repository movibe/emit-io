import type { LoggerStrategy, AnalyticsProvider } from '@movibe/logger'

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
  /** Track an error */
  error: (feature: string, name: string, critical: boolean, error: unknown, extra?: Record<string, unknown>) => void
}

export interface AnalyticsProviderProps {
  client: LoggerStrategy
  children: React.ReactNode
  /** Automatically track page views on navigation changes */
  autoTrack?: boolean
}

export interface AnalyticsErrorBoundaryProps {
  children?: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}
