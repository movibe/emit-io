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

## CI / GitHub Actions

- `LEFTHOOK=0` is set in release.yml — prevents git hooks from running during `changesets/action` git push
- GitHub Actions workflow permissions: `default_workflow_permissions: write` + `can_approve_pull_request_reviews: true` (repo setting, not in code)
- Release flow: push to main → changesets/action opens "Version Packages" PR → merge that PR → packages published

## Key patterns

- `Transport` interface requires `close?()` — implement to clean up timers/sockets
- `EmitIoStrategy` is the main class; `LoggerStrategy` is a deprecated alias
- `EventRegistry` module augmentation for type-safe events
- Use `createTestEmitter()` from `emit-io-core/test` in tests
