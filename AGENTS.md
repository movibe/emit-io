# AGENTS.md

## TL;DR

Bun workspace monorepo. 8 packages published as `emit-io-*` (no `@` scope). Core class is `EmitIoStrategy` (was `LoggerStrategy`). Zero runtime deps in core. Build with `bun build`, test with vitest (not bun test).

## Commands

```bash
bun install              # install all workspace deps
bun run test             # vitest run (all packages)
bun run test:watch       # vitest watch mode
bun run test:coverage    # vitest + v8 coverage
bun run build            # build all 8 packages sequentially (core first)
bun run bench            # core benchmark (tsx tinybench)
bun run bench:compare    # vs pino + winston
bun run lint             # ESLint on core only

# Build a single package:
bun run --filter emit-io-core build:all     # build + types
bun run --filter emit-io-react build:all

# Test a single package:
bun test packages/core/src/__tests__/LoggerStrategy.test.ts   # bun test directly
bun run --filter emit-io-fastify test                          # vitest via script
```

## Architecture

### Package names (npm)

No `@` scope: `emit-io-core`, `emit-io-react`, `emit-io-react-native`, `emit-io-next`, `emit-io-fastify`, `emit-io-hono`, `emit-io-otel`, `emit-io-codegen`.

### Key types (packages/core/src/types.ts)

- `EmitIoStrategy` — main class (generics: TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent)
- `EmitIoStrategyConfig` — constructor config (was `LoggerConfig`)
- `Transport` — interface with `name`, `minLevel`, `enabled?: boolean`, `log()`, `flush()?`
- `AnalyticsProvider` — interface with `name`, `enabled: boolean`, `event()`, `identify()`, `screen()`, `error()`
- `Plugin` — `(entry: LogEntry) => LogEntry | null`
- `LogEntry` — `{ level, message, timestamp, context?, error? }`
- `LogLevel` — enum: DEBUG=0, INFO=1, WARN=2, ERROR=3, FATAL=4

### Deprecated types — DO NOT RENAME

`LoggerStrategyType`, `LoggerStrategyConstructor` are legacy exports. They exist in source and tests under their original names. Do not rename them.

### Framework package names — DO NOT RENAME

`loggerPlugin` (fastify), `loggerMiddleware` (hono), `withLogger` (next) are the public framework APIs. These are NOT part of the rename.

## Build system

```
packages/core/          → 6 bundles (Node ESM/CJS, browser ESM, worker ESM, test-utils ESM/CJS)
packages/react/         → 2 bundles (browser ESM/CJS)
packages/react-native/  → 2 bundles (browser ESM/CJS)
packages/next/          → 2 bundles (Node ESM/CJS)
packages/fastify/       → 2 bundles (Node ESM/CJS)
packages/hono/          → 2 bundles (Node ESM/CJS)
packages/otel/          → 2 bundles (Node ESM/CJS)
packages/codegen/       → 1 bundle (CLI Node ESM)
```

Every package has `build`, `build:types`, `build:all`, and `prepack` scripts.
Build uses `bun build` with `--minify`.
`--external` for all peer/runtime dependencies.
`build:types` uses `bun x tsc --emitDeclarationOnly`.

## Testing

- **Runner:** vitest v2 at root (`vitest.config.ts`)
- **Config:** `globals: false` — always `import { test, expect, vi, describe } from 'vitest'`
- **Environment:** `node`
- **Pattern:** `packages/*/src/**/*.test.ts` (colocated)
- **Alias:** `emit-io-core` → `packages/core/src/index.ts` (frameworks resolve to source)
- **Exceptions:** `packages/react` and `packages/codegen` use `bun test` instead of vitest
- **Mocking:** `vi.fn()`, `vi.spyOn()`, inline transport objects with `vi.fn()` as `log`

### Test gotchas

- Some tests use `vi.resetModules()` and `vi.advanceTimersByTimeAsync()` — these ONLY work with vitest, not bun test
- Tests at `packages/core/src/__tests__/runtime-guards.test.ts` and `http-transport.test.ts` fail under bun test — expected
- `react-native` tests crash under bun test (require native modules) — expected
- Use `bun test packages/core/src/__tests__/LoggerStrategy.test.ts` for fast feedback on a single file

## Release workflow

On every push to main:
1. Auto-generates `.changeset/auto-patch-*.md` with `"pkg-name": patch` for all packages
2. `changeset version` bumps versions + writes CHANGELOGs
3. `bun run release` (build + `changeset publish`)
4. Creates GitHub Release with aggregated changelogs
5. Commits version bump with `[skip ci]`

**All 8 packages are linked** — they version-bump together.
Changesets config: `commit: false` (CI handles commits), `updateInternalDependencies: "patch"`.

## Conventions

- TypeScript strict mode, ES2022 target, NodeNext module resolution
- Zero runtime deps in core
- `interface` for public APIs, `type` for unions/aliases (converting interfaces to types planned "later")
- Transport `enabled` uses `!== false` check (not `=== true`) — allows `undefined` = enabled
- ConsoleTransport `log()` applies `enabled` internally; other transports rely on upstream `emitToTransports()` filter
- React Native `require()` pattern for optional deps: `declare function require` + `require('expo-router')` at module scope

### Error method gotcha

`error()` has overloaded dispatch:
- ≤2 args → log-level error (goes to transports)
- ≥3 args → analytics call (captureError — goes to transports AND providers)

### Constructor overloading

`new EmitIoStrategy(config?)` accepts either:
- `EmitIoStrategyConfig` (new API: providers, transports, plugins)
- `LoggerStrategyConstructor[]` (legacy, deprecated — array of `{ class, enabled }`)

## CI

- Node 20 + 22 matrix
- `bun install --frozen-lockfile`
- `npm test` then `npm run build`
- No coverage/lint step in CI
