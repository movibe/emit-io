# logger-rn-example

Expo (React Native) example using `@movibe/logger` + `@movibe/logger-react-native`.

## Features

- `AnalyticsProvider` wired at the root layout
- `AnalyticsErrorBoundary` with a custom RN fallback
- `useScreenTracking` on `Home` and `Profile` screens
- `useEventTracking` for one-shot mount events
- `useTrackEvent`, `useAnalytics().identify`, and `useCaptureError` demos
- File-based routing via `expo-router`
- AppState foreground/background tracking (enabled by default)

## Run

```bash
npm install
npm start            # opens Expo dev server
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run web          # Web
```

All analytics events go to the console via `ConsoleProvider` — open the dev
console (Metro logs or browser devtools on web) to see them.

## Structure

```
app/
  _layout.tsx     # AnalyticsProvider + ErrorBoundary + Stack
  index.tsx       # Home screen (CTA + identify)
  profile.tsx     # Profile screen (event + error capture)
src/
  logger.ts       # LoggerStrategy + ConsoleProvider
```
