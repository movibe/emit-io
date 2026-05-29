# emit-io-core

## 2.0.0

### Minor Changes

- [#12](https://github.com/movibe/emit-io/pull/12) [`fd48cc5`](https://github.com/movibe/emit-io/commit/fd48cc54a1ef13e11b35545d25ac99d3ce85df5f) Thanks [@movibe](https://github.com/movibe)! - ## What changed

  ### Bug fixes

  - **`Transport.close?()` added to contract** — `EmitIoStrategy.close()` now properly calls `close()` on all transports after flushing, preventing timer and WebSocket leaks on shutdown
  - **`LEVEL_LABELS` centralized** — was silently duplicated in `ConsoleTransport`, `JSONTransport`, and `DevToolsTransport`

  ### Build system (fixes broken published packages)

  - Migrated 6 packages (`react`, `react-native`, `fastify`, `hono`, `next`, `otel`) from `bun build` to `esbuild --bundle` — the previous `bun build` with barrel re-exports produced broken 260B stubs instead of real bundles
  - `packages/react-native` uses a `src/_bundle.ts` build entry to work around the Bun bundler limitation

  ### React adapter type-safety

  - Removed `as any` casts in `emit-io-react` (`provider.tsx`, `hooks.ts`, `server.ts`)
  - `useTrackEvent`, `useEventTracking`, and `withAnalytics` now correctly propagate `EventRegistry` generics — the headline type-safety feature now works end-to-end

  ### DX

  - Added **Biome** for lint + format across all packages (replaces EOL ESLint 8)
  - Added **lefthook** git hooks (pre-commit: biome check, pre-push: typecheck + tests)
  - MIT `LICENSE` file added (was declared in `files[]` of every package but never existed)

## 1.0.6

### Patch Changes

- Auto patch release

## 1.0.5

### Patch Changes

- Auto patch release

## 1.0.4

### Patch Changes

- Auto patch release

## 1.0.3

### Patch Changes

- Auto patch release

## 1.0.2

### Patch Changes

- Auto patch release

## 1.0.1

### Patch Changes

- Auto patch release
