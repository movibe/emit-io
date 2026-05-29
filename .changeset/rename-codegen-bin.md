---
"emit-io-codegen": major
---

## Breaking change: CLI binary renamed

The CLI binary has been renamed from `logger-codegen` (legacy name from the old project) to `emit-io-codegen` to match the package name and brand.

**Migration:**

```diff
- npx logger-codegen generate ...
+ npx emit-io-codegen generate ...
```

Update any `package.json` scripts, CI steps, or shell aliases that reference `logger-codegen`.
