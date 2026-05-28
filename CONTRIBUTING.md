# Contributing to emit-io

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 20

## Setup

```bash
git clone https://github.com/movibe/emit-io.git logger
cd logger
bun install
```

## Dev Workflow

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Build all packages
bun run build

# Run benchmarks
bun run bench

# Compare against pino/winston
bun run bench:compare
```

## Package Structure

The monorepo has 8 packages under `packages/`:

| Package | Description |
|---|---|
| `core` | Core logger — circuit breaker, rate limiting, analytics events, consent |
| `react` | React hooks and context provider |
| `react-native` | React Native adapter (Expo compatible) |
| `next` | Next.js integration (App Router / Pages Router) |
| `fastify` | Fastify plugin |
| `hono` | Hono middleware |
| `otel` | OpenTelemetry transport |
| `codegen` | Type-safe event code generator |

## Creating a Changeset

All user-visible changes must include a changeset:

```bash
bun changeset
```

Follow the prompts to select changed packages and describe the change. Commit the generated `.changeset/*.md` file alongside your code changes.

## Code Style

- TypeScript strict mode is required (`"strict": true` in tsconfig).
- Tests use [Vitest](https://vitest.dev) — place test files next to source as `*.test.ts`.
- Linting uses [Biome](https://biomejs.dev) — run `bun run lint` before opening a PR.
- Match existing file conventions: named exports, no default exports in library code.

## Pull Request Guidelines

1. Open an issue or discussion first for non-trivial changes.
2. Keep PRs focused — one feature or fix per PR.
3. Include a changeset if the change affects any published package.
4. Ensure `bun run test` and `bun run build` pass locally before pushing.
5. PR titles should follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
