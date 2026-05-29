import type { AnalyticsProvider, EmitIoStrategy, RegisteredEvents } from 'emit-io-core'

// AnyStrategy: accepts any specialization of EmitIoStrategy at the context boundary.
// Using all six `any` ensures a narrowly-typed caller (e.g. EmitIoStrategy<..., MyEvents, ...>)
// still satisfies this type without widening RegisteredEvents in the hook signatures.
type AnyStrategy = EmitIoStrategy<any, any, any, any, any, any>

export type AnalyticsContextValue = {
  client: AnyStrategy
  /** Direct access to the underlying providers, if needed */
  providers: AnalyticsProvider[]
  /** Track a custom event — constrained to keys of the global RegisteredEvents registry */
  event: <K extends keyof RegisteredEvents>(name: K, properties?: RegisteredEvents[K]) => void
  /** Track a screen view */
  screen: (name: string, params?: Record<string, unknown>) => void
  /** Identify a user */
  identify: (user: { id: string; [key: string]: unknown }) => void
  /** Track an analytics error with provider dispatch */
  captureError: (
    feature: string,
    name: string,
    critical: boolean,
    err: Error,
    extra?: Record<string, unknown>,
  ) => void
  /** @deprecated use captureError */
  error: (
    feature: string,
    name: string,
    critical: boolean,
    err: Error,
    extra?: Record<string, unknown>,
  ) => void
}

export type AnalyticsProviderProps = {
  client: AnyStrategy
  children: React.ReactNode
  /** Automatically track page views on navigation changes */
  autoTrack?: boolean
}
