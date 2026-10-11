# Release process

[简体中文](releasing.md) | [English](releasing.en.md)

Pushing a `v*` tag starts the Release workflow. It checks that the tag matches `package.json.version`, reuses the CI matrix, publishes to npm, and then creates a GitHub Release with generated release notes. GitHub automatically provides a source archive for each tag. Versions with a prerelease suffix are marked as prereleases and published under npm's `next` dist-tag; stable versions use `latest`.

## npm publishing identity

This package has a GitHub Actions Trusted Publisher: owner `exoticknight`, repository `dsh-system1`, workflow filename `release.yml`, `npm publish` allowed, and no environment name. The OIDC publication of `v0.2.1` validated this connection as `Valid`. The workflow publishes through OIDC without an npm token. A new trust relationship must complete its first successful publication within two days. See the [npm Trusted Publisher documentation](https://docs.npmjs.com/trusted-publishers/).

A Trusted Publisher cannot be configured before the npm package exists. The maintainer publishes `v0.2.0` interactively from its clean commit using `npm publish --access public --tag latest` and completes 2FA; that tag uses the previous workflow to create its GitHub Release. Subsequent tags use the OIDC workflow described here.

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

GitHub Releases contain release notes and GitHub's automatically generated source archives. Use the GitHub tag reference above to install the plugin, or run `pnpm add dsh-system1` after npm publication.

## Workflow behavior

- All checks in the Windows/Linux × Node 22.19/24 matrix must pass before publication.
- The release job reinstalls dependencies, builds, verifies that `lib/` matches the tagged commit, and publishes through npm CLI. It creates the GitHub Release only after npm publication succeeds.
- npm publishing uses the Trusted Publisher and the job's `id-token: write` permission. The GitHub Release uses the repository's `GITHUB_TOKEN` with `contents: write`.
- Runs for the same tag are serialized. An existing Release is not overwritten. npm versions cannot be republished. If npm publication succeeds but GitHub Release creation fails, inspect both states and create the GitHub Release manually.
