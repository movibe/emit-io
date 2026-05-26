// @vitest-environment happy-dom
import { test, expect, describe, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { AnalyticsErrorBoundary } from '../error-boundary.js'

function Boom(): null { throw new Error('boom') }

describe('AnalyticsErrorBoundary', () => {
  test('catches error and calls captureError on analytics', () => {
    const analytics = {
      captureError: vi.fn(),
      event: vi.fn(),
      screen: vi.fn(),
      identify: vi.fn(),
      client: {} as any,
      providers: [],
    } as any

    // Silence React error log
    const origError = console.error
    console.error = () => {}

    render(
      createElement(
        AnalyticsErrorBoundary,
        { analytics, fallback: createElement('span', null, 'fail') },
        createElement(Boom)
      )
    )

    console.error = origError

    expect(analytics.captureError).toHaveBeenCalledWith(
      'ReactNativeErrorBoundary',
      'Error',
      true,
      expect.any(Error),
      expect.objectContaining({ message: 'boom' })
    )
  })

  test('renders function fallback with reset', () => {
    let captured: any
    const fb = (err: Error, reset: () => void) => {
      captured = { err, reset }
      return createElement('span', null, err.message)
    }
    const origError = console.error
    console.error = () => {}
    render(
      createElement(AnalyticsErrorBoundary, { fallback: fb }, createElement(Boom))
    )
    console.error = origError
    expect(captured.err.message).toBe('boom')
    expect(typeof captured.reset).toBe('function')
  })
})
