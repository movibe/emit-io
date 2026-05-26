import { useState } from 'react'

/**
 * Throws during render once `armed` is true.
 * The surrounding <AnalyticsErrorBoundary> will catch it and dispatch
 * `captureError` to the logger providers.
 */
export function CrashButton() {
  const [armed, setArmed] = useState(false)

  if (armed) {
    throw new Error('CrashButton: simulated render error for boundary demo')
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      style={{
        background: '#dc2626',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      Crash the tree
    </button>
  )
}
