import { useEffect } from 'react'
import type { LoggerStrategy } from '@movibe/logger'

/**
 * Track screen views via @react-navigation/native NavigationContainer ref.
 * Caller is responsible for providing the navigation ref.
 *
 * Usage:
 *   const navRef = useNavigationContainerRef()
 *   useNavigationAnalytics(navRef, logger)
 *   <NavigationContainer ref={navRef}>...</NavigationContainer>
 */
export function useNavigationAnalytics(
  navigationRef: { current: { getCurrentRoute(): { name: string; params?: Record<string, unknown> } | undefined } | null } | null,
  client: LoggerStrategy
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
