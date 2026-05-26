import { useState } from 'react'
import {
  AnalyticsErrorBoundary,
  useAnalytics,
  useEventTracking,
  useTrackEvent,
} from '@movibe/logger-react'
import { CrashButton } from './components/CrashButton'

function Dashboard() {
  useEventTracking('app-mounted', { properties: { source: 'react-vite-example' } })

  const analytics = useAnalytics()
  const track = useTrackEvent()
  const [clicks, setClicks] = useState(0)

  const handleCta = () => {
    const next = clicks + 1
    setClicks(next)
    track('cta-clicked', { count: next })
  }

  const handleIdentify = () => {
    analytics.identify({ id: 'demo-user-1', plan: 'free' })
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>@movibe/logger-react · Vite Example</h1>
      <p style={styles.subtitle}>
        Open DevTools console to see analytics events and log entries.
      </p>

      <section style={styles.card}>
        <h2 style={styles.h2}>Track Events</h2>
        <button style={styles.btnPrimary} onClick={handleCta}>
          Fire CTA event ({clicks})
        </button>
        <button style={styles.btnSecondary} onClick={handleIdentify}>
          Identify user
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Error Boundary Demo</h2>
        <p style={styles.muted}>
          The button below throws — the boundary catches it and reports via
          <code> analytics.captureError</code>.
        </p>
        <CrashButton />
      </section>
    </main>
  )
}

export function App() {
  return (
    <AnalyticsErrorBoundary
      fallback={
        <div style={styles.errorFallback}>
          <h2>Boundary caught a crash</h2>
          <p>Check the console for the captured error.</p>
        </div>
      }
    >
      <Dashboard />
    </AnalyticsErrorBoundary>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: '2rem auto',
    padding: '0 1.25rem',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  title: { fontSize: '1.75rem', marginBottom: '0.25rem' },
  subtitle: { color: '#475569', marginTop: 0 },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '1rem 1.25rem',
    margin: '1rem 0',
    background: '#f8fafc',
  },
  h2: { fontSize: '1.1rem', margin: '0 0 0.75rem' },
  muted: { color: '#64748b', fontSize: '0.95rem' },
  btnPrimary: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 6,
    marginRight: '0.5rem',
    cursor: 'pointer',
  },
  btnSecondary: {
    background: '#e2e8f0',
    color: '#0f172a',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 6,
    cursor: 'pointer',
  },
  errorFallback: {
    maxWidth: 720,
    margin: '2rem auto',
    padding: '1rem 1.25rem',
    border: '1px solid #fecaca',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#991b1b',
  },
}
