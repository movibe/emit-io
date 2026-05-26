import { trace, type Tracer } from '@opentelemetry/api'
import type { AnalyticsProvider } from '@emit-io/core'

export interface OTelProviderOptions {
  name?: string
  enabled?: boolean
  tracerName?: string
}

export class OTelProvider implements AnalyticsProvider {
  readonly name: string
  enabled: boolean
  private tracer: Tracer

  constructor(opts?: OTelProviderOptions) {
    this.name = opts?.name ?? 'otel'
    this.enabled = opts?.enabled ?? true
    this.tracer = trace.getTracer(opts?.tracerName ?? '@emit-io/otel', '1.0.0')
  }

  init(): void {
    // no-op; OTel SDK should be initialized externally
  }

  event(name: string, properties?: Record<string, any>): void {
    const span = this.tracer.startSpan(`analytics.${name}`, {
      attributes: {
        'analytics.event.name': name,
        ...flatten(properties),
      },
    })
    span.end()
  }

  identify(user: { id: string; [key: string]: any }): void {
    const span = this.tracer.startSpan('analytics.identify', {
      attributes: {
        'analytics.user.id': user.id,
        ...flatten(user, 'analytics.user.'),
      },
    })
    span.end()
  }

  screen(name: string, params?: Record<string, any>): void {
    const span = this.tracer.startSpan(`analytics.screen.${name}`, {
      attributes: {
        'analytics.screen.name': name,
        ...flatten(params),
      },
    })
    span.end()
  }

  error(feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, any>): void {
    const span = this.tracer.startSpan(`analytics.error.${feature}.${name}`, {
      attributes: {
        'analytics.error.feature': feature,
        'analytics.error.name': name,
        'analytics.error.critical': critical,
        'error.message': err.message,
        'error.stack': err.stack ?? '',
        ...flatten(extra),
      },
    })
    span.recordException(err)
    span.end()
  }

  flush(): void {}
  reset(): void {}
}

function flatten(obj: Record<string, unknown> | undefined, prefix = ''): Record<string, string | number | boolean> {
  if (!obj) return {}
  const result: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      result[prefix + k] = v
    } else {
      result[prefix + k] = JSON.stringify(v)
    }
  }
  return result
}
