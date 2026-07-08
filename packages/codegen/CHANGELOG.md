# emit-io-codegen

## 3.0.0

### Major Changes

- [#16](https://github.com/movibe/emit-io/pull/16) [`d958e7b`](https://github.com/movibe/emit-io/commit/d958e7babfabec4cd0dbb4d78a9b73be75f85097) Thanks [@movibe](https://github.com/movibe)! - ## Breaking change: CLI binary renamed

  The CLI binary has been renamed from `logger-codegen` (legacy name from the old project) to `emit-io-codegen` to match the package name and brand.

  **Migration:**

  ```diff
  - npx logger-codegen generate ...
  + npx emit-io-codegen generate ...
  ```

  Update any `package.json` scripts, CI steps, or shell aliases that reference `logger-codegen`.

### Patch Changes

- [#16](https://github.com/movibe/emit-io/pull/16) [`d958e7b`](https://github.com/movibe/emit-io/commit/d958e7babfabec4cd0dbb4d78a9b73be75f85097) Thanks [@movibe](https://github.com/movibe)! - ## Packaging fixes

  - **LICENSE in every tarball** — all 7 adapter packages now include the MIT LICENSE file in their published tarball (`files` field + per-package LICENSE). Previously only `emit-io-core` and `emit-io-react` declared it in `files`, and only `emit-io-core` had the actual file.
  - **`bugs` and `homepage` fields** — added to all 7 packages (were missing, only core had them). Points to the GitHub issue tracker and repo README.
  - **`keywords`** — added to all 7 packages for npm discoverability (`logging`, `analytics`, `typescript`, `observability`, `emit-io`, plus package-specific terms).
  - **`repository.directory`** — added to all 8 packages to correctly link each package to its subdirectory in the monorepo.

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
