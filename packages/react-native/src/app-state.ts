import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import type { LoggerStrategy } from '@emitio/core'

/**
 * Tracks AppState transitions and emits analytics events:
 *   - app-foreground when active
 *   - app-background when background/inactive
 */
export function useAppStateAnalytics(client: LoggerStrategy): void {
  const prevState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      const wasActive = prevState.current === 'active'
      const isActive = next === 'active'

      if (!wasActive && isActive) {
        client.event?.('app-foreground' as any, {})
      } else if (wasActive && !isActive) {
        client.event?.('app-background' as any, { reason: next })
      }
      prevState.current = next
    }

    const sub = AppState.addEventListener('change', handler)
    return () => sub.remove()
  }, [client])
}
