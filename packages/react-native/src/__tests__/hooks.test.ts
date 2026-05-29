// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  useAnalytics,
  useCaptureError,
  useEventTracking,
  useScreenTracking,
  useTrackEvent,
} from '../hooks.js'
import { AnalyticsProvider } from '../provider.js'

// Mock react-native for AppStateTracker
vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}))

function createMockClient() {
  return {
    init: vi.fn(),
    event: vi.fn(),
    logScreen: vi.fn(),
    setUser: vi.fn(),
    captureError: vi.fn(),
    providers: [],
  } as any
}

function wrap(client: any) {
  return ({ children }: { children: ReactNode }) =>
    createElement(AnalyticsProvider, { client, trackAppState: false }, children)
}

describe('hooks', () => {
  test('useAnalytics returns context', () => {
    const client = createMockClient()
    const { result } = renderHook(() => useAnalytics(), { wrapper: wrap(client) })
    expect(result.current.client).toBe(client)
  })

  test('useAnalytics throws without provider', () => {
    expect(() => renderHook(() => useAnalytics())).toThrow(/AnalyticsProvider/)
  })

  test('useTrackEvent fires event', () => {
    const client = createMockClient()
    const { result } = renderHook(() => useTrackEvent(), { wrapper: wrap(client) })
    result.current('test-event', { x: 1 })
    expect(client.event).toHaveBeenCalledWith('test-event', { x: 1 })
  })

  test('useEventTracking fires once on mount', () => {
    const client = createMockClient()
    renderHook(() => useEventTracking('mount-event'), { wrapper: wrap(client) })
    expect(client.event).toHaveBeenCalledWith('mount-event', undefined)
  })

  test('useScreenTracking fires screen', () => {
    const client = createMockClient()
    renderHook(() => useScreenTracking('Home', { ref: 'x' }), { wrapper: wrap(client) })
    expect(client.logScreen).toHaveBeenCalledWith('Home', { ref: 'x' })
  })

  test('useCaptureError forwards', () => {
    const client = createMockClient()
    const { result } = renderHook(() => useCaptureError(), { wrapper: wrap(client) })
    const err = new Error('boom')
    result.current('F', 'N', true, err)
    expect(client.captureError).toHaveBeenCalledWith('F', 'N', true, err, undefined)
  })
})
