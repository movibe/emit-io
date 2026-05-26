// @vitest-environment happy-dom
import { test, expect, describe, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock react-native AppState
vi.mock('react-native', () => {
  const listeners: Array<(s: string) => void> = []
  return {
    AppState: {
      currentState: 'active',
      addEventListener: vi.fn((event: string, cb: (s: string) => void) => {
        listeners.push(cb)
        return {
          remove: vi.fn(() => {
            const idx = listeners.indexOf(cb)
            if (idx >= 0) listeners.splice(idx, 1)
          }),
        }
      }),
      __triggerChange: (next: string) => listeners.forEach(l => l(next)),
    },
  }
})

import { AppState } from 'react-native'
import { useAppStateAnalytics } from '../app-state.js'

describe('useAppStateAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('subscribes to AppState changes', () => {
    const client = { event: vi.fn() } as any
    renderHook(() => useAppStateAnalytics(client))
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  test('fires app-background on active → background', () => {
    const client = { event: vi.fn() } as any
    renderHook(() => useAppStateAnalytics(client))
    ;(AppState as any).__triggerChange('background')
    expect(client.event).toHaveBeenCalledWith('app-background', { reason: 'background' })
  })

  test('fires app-foreground on background → active', () => {
    const client = { event: vi.fn() } as any
    renderHook(() => useAppStateAnalytics(client))
    ;(AppState as any).__triggerChange('background')
    client.event.mockClear()
    ;(AppState as any).__triggerChange('active')
    expect(client.event).toHaveBeenCalledWith('app-foreground', {})
  })

  test('does not double-fire on same state', () => {
    const client = { event: vi.fn() } as any
    renderHook(() => useAppStateAnalytics(client))
    ;(AppState as any).__triggerChange('active')
    expect(client.event).not.toHaveBeenCalled()
  })
})
