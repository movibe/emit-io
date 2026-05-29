# CLAUDE.md — emit-io

## Release rules (MANDATORY)

Every `feat/*` or `fix/*` branch MUST have a changeset before pushing:

```bash
bun run changeset    # select packages + patch/minor/major
git add .changeset/
git commit -m "chore: add changeset"
```

The lefthook pre-push hook blocks pushes without a changeset on these branches.
Skip only for non-release changes (docs, CI, typos): `git push --no-verify`

All 8 packages are version-linked — bumping one bumps all.

## Build

- `emit-io-core` and `emit-io-codegen`: `bun build` (single entry, works)
- All others: `esbuild --bundle` (barrel re-exports + Bun = broken 260B stubs)
- `emit-io-react-native`: uses `src/_bundle.ts` as entry (not `src/index.ts`)
- After code changes: `bun run build` to regenerate dist/

## Tests

```bash
bun run test              # all ~415 tests
bun run test:coverage     # with coverage
```

All packages use vitest. Run from repo root.

## Lint

```bash
bun run lint              # Biome across all packages
bun run format            # Biome format --write
```

## Key patterns

- `Transport` interface requires `close?()` — implement to clean up timers/sockets
- `EmitIoStrategy` is the main class; `LoggerStrategy` is a deprecated alias
- `EventRegistry` module augmentation for type-safe events
- Use `createTestEmitter()` from `emit-io-core/test` in tests
