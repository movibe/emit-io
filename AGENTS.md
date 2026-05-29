# AGENTS.md

## TL;DR

Bun workspace monorepo. 8 packages published as `emit-io-*` (no `@` scope). Core class is `EmitIoStrategy` (was `LoggerStrategy`). Zero runtime deps in core. Build uses `bun build` for core/codegen and `esbuild --bundle` for all other packages. Test with vitest (not bun test).

## Commands

```bash
bun install              # install all workspace deps (examples included as workspace members)
bun run test             # vitest run (34 test files, ~415 tests)
bun run test:watch       # vitest watch mode
bun run test:coverage    # vitest + v8 coverage
bun run build            # build all 8 packages sequentially (core first)
bun run bench            # core benchmark (tsx tinybench)
bun run bench:compare    # vs pino + winston
bun run lint             # Biome lint across ALL packages
bun run format           # Biome format --write across ALL packages
bun run changeset        # create a changeset for release

# Build a single package:
bun run --filter emit-io-core build:all     # build + types
bun run --filter emit-io-react build:all
```

## Architecture

### Package names (npm)

No `@` scope: `emit-io-core`, `emit-io-react`, `emit-io-react-native`, `emit-io-next`, `emit-io-fastify`, `emit-io-hono`, `emit-io-otel`, `emit-io-codegen`.

### Key types (packages/core/src/types.ts)

- `EmitIoStrategy` — main class (generics: TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent)
- `EmitIoStrategyConfig` — constructor config (was `LoggerConfig`)
- `Transport` — interface with `name`, `minLevel`, `enabled?: boolean`, `log()`, `flush?()`, `close?()`
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
packages/core/          → 6 bundles (Node ESM/CJS, browser ESM, worker ESM, test-utils ESM/CJS) — bun build
packages/codegen/       → 1 bundle (CLI Node ESM) — bun build
packages/react/         → 2 bundles (browser ESM/CJS) — esbuild --bundle
packages/react-native/  → 2 bundles (browser ESM/CJS) — esbuild --bundle
packages/next/          → 2 bundles (Node ESM/CJS) — esbuild --bundle
packages/fastify/       → 2 bundles (Node ESM/CJS) — esbuild --bundle
packages/hono/          → 2 bundles (Node ESM/CJS) — esbuild --bundle
packages/otel/          → 2 bundles (Node ESM/CJS) — esbuild --bundle
```

**Why esbuild for most packages:** Bun's bundler does not resolve `.js` → `.ts` extensions in barrel re-export files, producing broken ~260B stubs. Only `emit-io-core` and `emit-io-codegen` use `bun build` because their entry points are not barrel re-exports.

**react-native special case:** Uses `src/_bundle.ts` as build entry (explicit import+export pattern) instead of `src/index.ts` (re-export barrel) to work around the same Bun limitation.

Every package has `build`, `build:types`, `build:all`, and `prepack` scripts.
`--external` for all peer/runtime dependencies.
`build:types` uses `bun x tsc --emitDeclarationOnly`.

## Testing

- **Runner:** vitest v2 at root (`vitest.config.ts`)
- **Config:** `globals: false` — always `import { test, expect, vi, describe } from 'vitest'`
- **Environment:** `node`
- **Pattern:** `packages/*/src/**/*.test.ts` (colocated) + example smoke tests
- **Smoke tests included:** `examples/fastify-server/src/__tests__/smoke.test.ts` and `examples/hono-worker/src/__tests__/smoke.test.ts`
- **Alias:** `emit-io-core` → `packages/core/src/index.ts` (frameworks resolve to source)
- **All packages use vitest** — `packages/react` and `packages/codegen` no longer use bun test
- **Deduplication:** `resolve.dedupe: ['react', 'react-dom', 'react-native']` prevents multiple React instances when the react-native-expo example is a workspace member
- **Mocking:** `vi.fn()`, `vi.spyOn()`, inline transport objects with `vi.fn()` as `log`

### Test gotchas

- Some tests use `vi.resetModules()` and `vi.advanceTimersByTimeAsync()` — these ONLY work with vitest
- `react-native` tests require react-native module mocking — handled via vitest config

## Release workflow

The old auto-patch-on-every-push approach is gone. The current flow uses Changesets properly:

1. **Create a changeset** while working on your branch:
   ```bash
   bun run changeset   # select packages + bump type (patch/minor/major)
   git add .changeset/
   git commit -m "chore: add changeset"
   ```
2. **Commit the changeset file** alongside your code changes.
3. **Push to main** (or merge a PR into main).
4. `changesets/action` in `release.yml` automatically opens a **"Version Packages"** PR.
5. **Merge that PR** → all linked packages are published to npm at the new version.

**All 8 packages are linked** — bumping one bumps all.

- `NPM_CONFIG_PROVENANCE=true` is set in CI for npm provenance attestations.
- **RULE: `feat/*` and `fix/*` branches MUST have a changeset before pushing.** The lefthook pre-push hook blocks without one. Skip with `git push --no-verify` only for non-release changes (docs, CI fixes, typos).

Changesets config: `commit: false` (CI handles commits), `updateInternalDependencies: "patch"`.

## Lint and formatting

- **Biome** (`biome.json` at root) replaces ESLint 8 — covers ALL 8 packages.
- **lefthook** for git hooks:
  - `pre-commit`: Biome check on staged files
  - `pre-push`: typecheck + tests + changeset check

## CI

- Node 20 + 22 matrix, `bun install --frozen-lockfile`
- Steps: lint (Biome) → build → test:coverage (uploads to Codecov) → typecheck examples
- `NPM_CONFIG_PROVENANCE=true` set for npm provenance on publish

## Conventions

- TypeScript strict mode, ES2022 target, NodeNext module resolution
- Zero runtime deps in core
- `type` for all type definitions (was `interface`; converted in refactor/interface-to-type)
- `interface` only for declaration merging: `EventRegistry` (module augmentation) and `FastifyRequest` (fastify augmentation)
- Transport `enabled` uses `!== false` check (not `=== true`) — allows `undefined` = enabled
- ConsoleTransport `log()` applies `enabled` internally; other transports rely on upstream `emitToTransports()` filter
- React Native `require()` pattern for optional deps: `declare function require` + `require('expo-router')` at module scope
- `Transport.close?()` — optional method to clean up timers/sockets; `EmitIoStrategy.close()` calls flush then close on all transports

### Error method gotcha

`error()` has overloaded dispatch:
- ≤2 args → log-level error (goes to transports)
- ≥3 args → analytics call (captureError — goes to transports AND providers)

### Constructor overloading

`new EmitIoStrategy(config?)` accepts either:
- `EmitIoStrategyConfig` (new API: providers, transports, plugins)
- `LoggerStrategyConstructor[]` (legacy, deprecated — array of `{ class, enabled }`)
