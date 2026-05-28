// Build entry for Bun bundler — uses import+export (not re-export) to force proper module resolution.
// Bun does not bundle relative re-exports (export { X } from './x') correctly; this pattern works.

import { useAppStateAnalytics } from './app-state'
import {
  useAnalytics,
  useCaptureError,
  useEventTracking,
  useIdentify,
  useScreenTracking,
  useTrackEvent,
} from './hooks'
import { useExpoRouterTracking, useNavigationAnalytics, useNavigationTracking } from './navigation'
import { AnalyticsProvider } from './provider'

export {
  AnalyticsProvider,
  useAnalytics,
  useAppStateAnalytics,
  useCaptureError,
  useEventTracking,
  useExpoRouterTracking,
  useIdentify,
  useNavigationAnalytics,
  useNavigationTracking,
  useScreenTracking,
  useTrackEvent,
}
