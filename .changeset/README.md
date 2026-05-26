# Changesets

This monorepo uses [changesets](https://github.com/changesets/changesets) for versioning.

## Adding a changeset

```bash
npx changeset
```

Follow prompts: select packages, pick semver bump, write summary.

## Release flow

1. PR with changeset(s) merged to main
2. GitHub Action creates a "Version Packages" PR
3. Merge that PR → automatic npm publish for all bumped packages
