import type { LoggerStrategy, AnalyticsProvider } from '@movibe/logger'
import type { ReactNode } from 'react'

export interface AnalyticsContextValue {
  client: LoggerStrategy
  providers: AnalyticsProvider[]
  event: (name: string, properties?: Record<string, unknown>) => void
  screen: (name: string, params?: Record<string, unknown>) => void
  identify: (user: { id: string; [key: string]: unknown }) => void
  captureError: (feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>) => void
}

export interface AnalyticsProviderProps {
  client: LoggerStrategy
  children: ReactNode
  /** Auto-track AppState transitions (foreground/background) — default true */
  trackAppState?: boolean
}

export interface AnalyticsErrorBoundaryProps {
  children?: ReactNode
  fallback?: ReactNode | ((err: Error, reset: () => void) => ReactNode)
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
  analytics?: AnalyticsContextValue
}
