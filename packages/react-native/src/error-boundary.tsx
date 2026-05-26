import { Component, createElement } from 'react'
import type { AnalyticsContextValue, AnalyticsErrorBoundaryProps } from './types.js'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AnalyticsErrorBoundary extends Component<AnalyticsErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  reset(): void {
    this.setState({ hasError: false, error: null })
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, { componentStack: errorInfo.componentStack ?? '' })

    if (this.props.analytics) {
      this.props.analytics.captureError(
        'ReactNativeErrorBoundary',
        error.name,
        true,
        error,
        {
          componentStack: errorInfo.componentStack ?? '',
          message: error.message,
        }
      )
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const fb = this.props.fallback
      if (typeof fb === 'function') {
        return fb(this.state.error!, this.reset)
      }
      if (fb) return fb
      return null  // Sem fallback DOM padrão — RN não tem <div>
    }
    return this.props.children ?? null
  }
}

export function withAnalyticsErrorBoundary<P extends object>(
  Component_: React.ComponentType<P>,
  analytics?: AnalyticsContextValue,
  fallback?: AnalyticsErrorBoundaryProps['fallback']
): React.ComponentType<P> {
  const displayName = Component_.displayName || Component_.name || 'Component'
  const Wrapped = (props: P) =>
    createElement(
      AnalyticsErrorBoundary,
      { analytics, fallback },
      createElement(Component_, props)
    )
  Wrapped.displayName = `withAnalyticsErrorBoundary(${displayName})`
  return Wrapped
}
