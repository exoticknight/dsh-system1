# Release process

[简体中文](releasing.md) | [English](releasing.en.md)

Pushing a `v*` tag starts the Release workflow. It checks that the tag matches `package.json.version`, reuses the CI matrix, and creates a GitHub Release with generated release notes. GitHub automatically provides a source archive for each tag. Versions with a prerelease suffix are marked as prereleases.

## Prepare a release

1. Confirm that CI passes on the default branch and that public APIs and docs are current.
2. Update `package.json.version`, then run `pnpm install --lockfile-only` and `pnpm verify`.
3. Commit the version change and push it to `main`.
4. Create and push a tag matching the version. For `0.1.0`:

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## Install a release

Install a tagged release directly from GitHub:

```sh
dsh plugin --profile headless add github:exoticknight/dsh-system1#vX.Y.Z
```

GitHub Releases contain release notes and GitHub's automatically generated source archives. Use the GitHub tag reference above to install the plugin.

## Workflow behavior

- All checks in the Windows/Linux × Node 22.19/24 matrix must pass before publication.
- The release job creates the GitHub Release and generates release notes with GitHub CLI. It does not build or upload package files.
- The release job uses the repository's `GITHUB_TOKEN` with `contents: write`; TypeSafe and npm credentials are not required.
- The workflow publishes to GitHub Releases. Publishing to the npm registry is a separate process.
- Runs for the same tag are serialized. An existing Release is not overwritten. After a failure, inspect the tag and Release state before retrying or publishing a fix version.
