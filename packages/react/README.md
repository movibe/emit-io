# emit-io-react

React bindings for [emit-io-core](https://github.com/movibe/emit-io) — hooks, context provider, and server action wrapper.

## Install

```bash
npm install emit-io-core emit-io-react
```

## Quick Start

```tsx
import { AnalyticsProvider, useAnalytics, usePageTracking, useTrackEvent } from 'emit-io-react'
import { LoggerStrategy, ConsoleTransport, LogLevelEnum } from 'emit-io-core'

const logger = new LoggerStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.INFO })],
})

export default function App() {
  return (
    <AnalyticsProvider client={logger} autoTrack>
      <Router />
    </AnalyticsProvider>
  )
}

function ProductPage() {
  usePageTracking('/products')
  const track = useTrackEvent()

  return (
    <button onClick={() => track('add-to-cart', { productId: '1' })}>
      Add to Cart
    </button>
  )
}
```

## Provider

```tsx
<AnalyticsProvider
  client={logger}
  autoTrack   // auto-fire screen view on location changes
>
  {children}
</AnalyticsProvider>
```

**Props:** `client: LoggerStrategy`, `autoTrack?: boolean`, `children: ReactNode`

## Hooks

| Hook | Returns | Description |
|---|---|---|
| `useAnalytics()` | `AnalyticsContextValue` | Access the full context object |
| `useTrackEvent()` | `(name, props?) => void` | Returns a stable event sender |
| `useEventTracking(name, opts?)` | `void` | Auto-fires event on mount |
| `usePageTracking(path?)` | `void` | Auto-fires screen view on mount |
| `useIdentify()` | `(user) => void` | Returns identify function |
| `useFormAnalytics(formName)` | `{ pending: boolean }` | Tracks form submission lifecycle (React 19) |

### `useEventTracking` options

```typescript
useEventTracking('product-viewed', {
  properties: { productId: '1' },
  once: true,       // only fire once per component lifetime
  unless: !isReady, // skip when condition is true
})
```

### `useFormAnalytics`

Requires React 19 (`react-dom >= 19`). Must be used inside a child of a `<form action={...}>` element.

```tsx
function SubmitButton({ formName }: { formName: string }) {
  const { pending } = useFormAnalytics(formName)
  return <button disabled={pending}>Submit</button>
}
```

Fires `form-submit-start` and `form-submit-complete` events automatically.

## Server Action Wrapper (`./server` subpath)

Safe to import in server components and server actions — no `'use client'` directive.

```typescript
import { withAnalytics } from 'emit-io-react/server'
import { logger } from '@/lib/logger'

export const submitForm = withAnalytics(
  async (formData: FormData) => {
    // ... server action logic
  },
  {
    eventName: 'submit-contact-form',
    logger,
    extractProps: (fd) => ({ email: fd.get('email') }),
  }
)
```

Fires `eventName` with `status: 'success' | 'error'` and `durationMs` automatically.

## Context Value Shape

```typescript
interface AnalyticsContextValue {
  client: LoggerStrategy
  providers: AnalyticsProvider[]
  event(name: string, properties?: Record<string, unknown>): void
  screen(name: string, params?: Record<string, unknown>): void
  identify(user: { id: string; [key: string]: unknown }): void
  captureError(feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>): void
}
```

## Peer Dependencies

| Package | Version |
|---|---|
| `emit-io-core` | `^1.0.0` |
| `react` | `^18.0.0 \|\| ^19.0.0` |
| `react-dom` | `^18.0.0 \|\| ^19.0.0` |

## License

MIT
