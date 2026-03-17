# Releasing

We use [changesets](https://github.com/changesets/changesets) to manage versioning and publishing. Only the `diffity` CLI package (in `packages/cli`) is published to npm. All other packages (`@diffity/git`, `@diffity/parser`, `@diffity/ui`) are private workspace packages bundled into the CLI.

## Creating a Changeset

After making changes that should be released, create a changeset:

```bash
npm run changeset
```

This will prompt you to:
1. Select which packages changed (choose `diffity`)
2. Pick a semver bump type (patch / minor / major)
3. Write a summary of the changes

A markdown file is created in `.changeset/` — commit it with your changes.

### When to use each bump type

- **patch** — bug fixes, internal refactors, dependency updates
- **minor** — new features, new CLI flags, non-breaking UI changes
- **major** — breaking changes to CLI arguments or behavior

## Release Process

```bash
# 1. Consume changesets — bumps version in package.json, generates CHANGELOG.md
npm run version

# 2. Review and commit the version bump
git add -A && git commit -m "chore: bump version"

# 3. Build all packages and publish to npm
npm run release

# 4. Push the commit and tag
git push && git push --tags
```

## Verifying a Release

After publishing, verify the package works:

```bash
npm install -g diffity@latest
diffity --version
```

## Notes

- `npm run release` runs a full build before publishing, so you don't need to build separately.
- Changesets automatically creates a git tag for each release (e.g. `diffity@0.2.0`).
- If a publish fails, fix the issue and run `npm run release` again — changesets won't re-bump the version.
