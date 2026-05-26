# @emit-io/react · Vite Example

Minimal **React 19 + Vite 5** app demonstrating
[`@emit-io/core`](../../packages/core) and
[`@emit-io/react`](../../packages/react) in the browser.

## What it shows

- `AnalyticsProvider` with `autoTrack` (auto-fires `screen` on mount).
- `useEventTracking('app-mounted', …)` lifecycle event.
- `useTrackEvent()` for an on-click CTA event.
- `useAnalytics().identify(...)` for user identification.
- `AnalyticsErrorBoundary` catching a render crash and reporting via
  `analytics.captureError`.
- Browser-safe transport / provider only — no Node APIs touched.

## Run

```bash
# from repo root (workspaces)
bun install

# then in this example dir
cd examples/react-vite
bun run dev
```

Open <http://localhost:5173> and watch the browser DevTools console:

- `ConsoleTransport` prints structured log entries.
- `ConsoleProvider` prints `[analytics]` event / screen / identify lines.
- Click **Crash the tree** to see the error boundary fire `captureError`.

## Files

| File | What it does |
|---|---|
| `src/logger.ts` | Builds a browser-only `LoggerStrategy` with `ConsoleTransport` + `ConsoleProvider`. |
| `src/main.tsx` | Mounts React 19 root and wraps the app in `<AnalyticsProvider>`. |
| `src/App.tsx` | Uses the analytics hooks, wraps in `AnalyticsErrorBoundary`. |
| `src/components/CrashButton.tsx` | Throws during render to demo the boundary. |
