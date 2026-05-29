import type { EmitIoStrategy } from 'emit-io-core'
import { useEffect, useRef } from 'react'

declare function require(module: string): any

export function useExpoRouterTracking(client: EmitIoStrategy): void {
  const { usePathname, useGlobalSearchParams } = require('expo-router')

  const pathname = usePathname()
  const params = useGlobalSearchParams()

  useEffect(() => {
    client.logScreen?.(pathname, params as Record<string, unknown>)
  }, [pathname, params, client.logScreen])
}

/**
 * Track screen views via @react-navigation/native using onReady/onStateChange (no polling).
 * Returns the ref + callbacks to wire into <NavigationContainer>.
 *
 * Usage:
 *   import { useNavigationTracking, useAnalytics } from 'emit-io-react-native'
 *
 *   export default function App() {
 *     const { client } = useAnalytics()
 *     const { ref, onReady, onStateChange } = useNavigationTracking(client)
 *     return (
 *       <NavigationContainer ref={ref} onReady={onReady} onStateChange={onStateChange}>
 *         ...
 *       </NavigationContainer>
 *     )
 *   }
 */
export function useNavigationTracking(client: EmitIoStrategy): {
  ref: {
    current: {
      getCurrentRoute(): { name: string; params?: Record<string, unknown> } | undefined
    } | null
  }
  onReady: () => void
  onStateChange: () => void
} {
  const { useNavigationContainerRef } = require('@react-navigation/native')
  const navigationRef = useNavigationContainerRef()
  const routeNameRef = useRef<string>()

  const track = () => {
    const route = navigationRef.current?.getCurrentRoute?.()
    if (!route) return
    if (route.name !== routeNameRef.current) {
      routeNameRef.current = route.name
      client.logScreen?.(route.name, route.params)
    }
  }

  return {
    ref: navigationRef,
    onReady: track,
    onStateChange: track,
  }
}

/** @deprecated Use useNavigationTracking instead — it uses onReady/onStateChange (no polling). */
export function useNavigationAnalytics(
  navigationRef: {
    current: {
      getCurrentRoute(): { name: string; params?: Record<string, unknown> } | undefined
    } | null
  } | null,
  client: EmitIoStrategy,
): void {
  useEffect(() => {
    if (!navigationRef?.current) return

    let prevRouteName: string | undefined

    const interval = setInterval(() => {
      const route = navigationRef.current?.getCurrentRoute?.()
      if (!route) return
      if (route.name !== prevRouteName) {
        client.logScreen?.(route.name, route.params)
        prevRouteName = route.name
      }
    }, 100)

    return () => clearInterval(interval)
  }, [navigationRef, client])
}
