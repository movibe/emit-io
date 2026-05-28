import type { AnalyticsProvider } from './types.js'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export type CircuitBreakerOptions = {
  failureThreshold?: number
  cooldownMs?: number
  onStateChange?: (state: CircuitState, providerName: string) => void
}

export function circuitBreaker<P extends AnalyticsProvider>(
  provider: P,
  opts?: CircuitBreakerOptions,
): P {
  const threshold = opts?.failureThreshold ?? 5
  const cooldown = opts?.cooldownMs ?? 30000
  const onChange = opts?.onStateChange

  let state: CircuitState = 'CLOSED'
  let failures = 0
  let openedAt = 0

  function transition(next: CircuitState): void {
    if (state === next) return
    state = next
    onChange?.(next, provider.name)
  }

  function checkOpenExpiry(): void {
    if (state === 'OPEN' && Date.now() - openedAt >= cooldown) {
      transition('HALF_OPEN')
    }
  }

  function onSuccess(): void {
    failures = 0
    if (state !== 'CLOSED') transition('CLOSED')
  }

  function onFailure(): void {
    failures += 1
    if (state === 'HALF_OPEN') {
      openedAt = Date.now()
      transition('OPEN')
      return
    }
    if (failures >= threshold) {
      openedAt = Date.now()
      transition('OPEN')
    }
  }

  function wrap<T extends (...args: any[]) => any>(fn: T | undefined): T | undefined {
    if (!fn) return undefined
    return ((...args: any[]) => {
      checkOpenExpiry()
      if (state === 'OPEN') return undefined
      try {
        const result = fn.apply(provider, args)
        onSuccess()
        return result
      } catch (err) {
        onFailure()
        throw err
      }
    }) as T
  }

  return new Proxy(provider, {
    get(target, prop) {
      const val = (target as any)[prop]
      if (typeof val !== 'function') return val
      if (prop === 'name' || prop === 'enabled') return val
      return wrap(val.bind(target))
    },
  })
}
