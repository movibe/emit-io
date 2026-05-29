---
"emit-io-react": patch
"emit-io-react-native": patch
"emit-io-codegen": patch
"emit-io-fastify": patch
"emit-io-next": patch
"emit-io-hono": patch
"emit-io-otel": patch
---

## Packaging fixes

- **LICENSE in every tarball** — all 7 adapter packages now include the MIT LICENSE file in their published tarball (`files` field + per-package LICENSE). Previously only `emit-io-core` and `emit-io-react` declared it in `files`, and only `emit-io-core` had the actual file.
- **`bugs` and `homepage` fields** — added to all 7 packages (were missing, only core had them). Points to the GitHub issue tracker and repo README.
- **`keywords`** — added to all 7 packages for npm discoverability (`logging`, `analytics`, `typescript`, `observability`, `emit-io`, plus package-specific terms).
- **`repository.directory`** — added to all 8 packages to correctly link each package to its subdirectory in the monorepo.
