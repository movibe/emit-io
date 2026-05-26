'use client'

import { Component, createElement } from 'react'
import type { AnalyticsContextValue } from './types.js'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children?: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  analytics?: AnalyticsContextValue
}

export class AnalyticsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)

    if (this.props.analytics) {
      this.props.analytics.captureError(
        'ReactErrorBoundary',
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
      if (this.props.fallback) {
        return this.props.fallback
      }
      return createElement(
        'div',
        { style: { padding: '1rem', color: '#b91c1c' } },
        createElement('h2', null, 'Something went wrong'),
        createElement('pre', { style: { fontSize: '0.875rem', marginTop: '0.5rem' } },
          this.state.error?.message ?? 'Unknown error'
        )
      )
    }

    return this.props.children ?? null
  }
}

export function withAnalyticsErrorBoundary<P extends object>(
  Component_: React.ComponentType<P>,
  analytics?: AnalyticsContextValue,
  fallback?: ReactNode
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
