# emit-io-react-native

React Native bindings for [emit-io-core](https://github.com/movibe/emit-io) — hooks, provider, AppState tracking, and React Navigation integration.

## Install

```bash
npm install emit-io-core emit-io-react-native
# optional: screen tracking via React Navigation
npm install @react-navigation/native
```

## Quick Start

```tsx
import { AnalyticsProvider, useAnalytics, useScreenTracking } from 'emit-io-react-native'
import { EmitIoStrategy, ConsoleTransport, LogLevelEnum } from 'emit-io-core'

const emit = new EmitIoStrategy({
  transports: [new ConsoleTransport({ minLevel: LogLevelEnum.INFO })],
})

export default function App() {
  return (
    <AnalyticsProvider client={emit} trackAppState>
      <RootStack />
    </AnalyticsProvider>
  )
}

function HomeScreen() {
  const { event } = useAnalytics()
  useScreenTracking('Home')

  return <Button onPress={() => event('cta-click')} title="Go" />
}
```

## Provider

```tsx
<AnalyticsProvider
  client={emit}
  trackAppState   // auto-track foreground/background via AppState (default: true)
>
  {children}
</AnalyticsProvider>
```

**Props:** `client: EmitIoStrategy`, `trackAppState?: boolean` (default `true`), `children: ReactNode`

## Hooks

| Hook | Returns | Description |
|---|---|---|
| `useAnalytics()` | `AnalyticsContextValue` | Access the full context |
| `useTrackEvent()` | `(name, props?) => void` | Returns a stable event sender |
| `useEventTracking(name, opts?)` | `void` | Auto-fires event on mount |
| `useScreenTracking(name, params?)` | `void` | Auto-fires screen view on mount |
| `useIdentify()` | `(user) => void` | Returns identify function |
| `useCaptureError()` | `(feature, name, critical, err, extra?) => void` | Returns captureError function |
| `useAppStateAnalytics(client)` | `void` | Tracks foreground/background transitions |
| `useNavigationAnalytics(navRef, client)` | `void` | Tracks screens via React Navigation |

### `useScreenTracking`

```tsx
function ProductScreen({ route }) {
  useScreenTracking('Product', { productId: route.params.id })
  // fires screen('Product', { productId: '...' }) on mount
}
```

### `useCaptureError`

```tsx
function PaymentButton() {
  const captureError = useCaptureError()

  const handlePress = async () => {
    try {
      await processPayment()
    } catch (err) {
      captureError('Payments', 'charge_failed', true, err as Error, { retries: 3 })
    }
  }
}
```

### `useNavigationAnalytics`

```tsx
import { useNavigationAnalytics } from 'emit-io-react-native'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'

export default function App() {
  const navRef = useNavigationContainerRef()

  useNavigationAnalytics(navRef, logger)

  return (
    <NavigationContainer ref={navRef}>
      <RootStack />
    </NavigationContainer>
  )
}
```

Fires `screen(routeName, params)` on every navigation state change.

## Context Value Shape

```typescript
interface AnalyticsContextValue {
  client: EmitIoStrategy
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
| `react-native` | `>=0.72.0` |
| `@react-navigation/native` | optional |

## License

MIT
