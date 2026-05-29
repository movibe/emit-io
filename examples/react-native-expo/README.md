# logger-rn-example

Expo (React Native) example using `emit-io-core` + `emit-io-react-native`.

- Expo SDK 56, React Native 0.76.9
- File-based routing via `expo-router`
- All analytics and log events output to console (Metro logs in terminal)

## Features

- `AnalyticsProvider` wired at the root layout
- Local `ErrorBoundary` React class component (in `src/ErrorBoundary.tsx`)
- `useScreenTracking` on Home and Profile screens
- `useEventTracking` for one-shot mount events on Profile
- `useTrackEvent`, `useAnalytics().identify`, and `useCaptureError` demos

## Structure

```
app/
  _layout.tsx      # AnalyticsProvider + ErrorBoundary + Stack navigation
  index.tsx        # Home screen — CTA, identify, screen tracking
  profile.tsx      # Profile screen — event tracking, error capture
src/
  logger.ts        # EmitIoStrategy with ConsoleTransport + ConsoleProvider
  ErrorBoundary.tsx  # Local React class error boundary
metro.config.js    # Workspace monorepo config with React deduplication
```

### Key files

- **`src/logger.ts`** — creates an `EmitIoStrategy` with `ConsoleTransport` (for log output) and `ConsoleProvider` (for analytics events).
- **`src/ErrorBoundary.tsx`** — local React class component that catches render errors. `AnalyticsErrorBoundary` does not exist in `emit-io-react-native`; this boundary is project-local.
- **`app/_layout.tsx`** — wraps the app with `AnalyticsProvider` from `emit-io-react-native`, then the local `ErrorBoundary`, then expo-router's `Stack`.
- **`app/index.tsx`** — uses `useScreenTracking`, `useAnalytics`, and `useTrackEvent`.
- **`app/profile.tsx`** — uses `useScreenTracking`, `useEventTracking` (once on mount), `useTrackEvent`, and `useCaptureError`.

## Running

This example is a workspace member. Run all commands from the **repository root**.

```bash
# 1. Install dependencies (once, from repo root)
bun install

# 2. Build all packages (required before first run and after package changes)
bun run build

# 3. Start Expo dev server
cd examples/react-native-expo && npx expo start --ios
```

If you change `metro.config.js`, restart Metro with `--clear`:

```bash
npx expo start --ios --clear
```

All analytics events and log output go to the console — watch Metro logs in your terminal.
