# Release process

[English](releasing.md) | [简体中文](../zh-CN/releasing.md)

Pushing a `v*` tag starts the Release workflow. It checks that the tag matches `package.json.version`, reuses the CI matrix, builds a package archive, and creates a GitHub Release with the `.tgz` archive and `SHA256SUMS`. Versions with a prerelease suffix are marked as prereleases.

## Prepare a release

1. Confirm that CI passes on the default branch and that public APIs and docs are current.
2. Update `package.json.version`, then run `pnpm install --lockfile-only` and `pnpm verify`.
3. Commit the version change and push it to `main`.
4. Create and push a tag matching the version. For `0.1.0`:

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## Install a release archive

The default installation uses the GitHub repository directly. To install a `.tgz` archive instead, download one from [GitHub Releases](https://github.com/exoticknight/dsh-system1/releases), change to the download folder, and pass its resolved path.

PowerShell:

```powershell
$package = (Get-ChildItem .\dsh-system1-*.tgz | Select-Object -First 1).FullName
dsh plugin --profile headless add $package
```

macOS or Linux:

```sh
dsh plugin --profile headless add "$(realpath dsh-system1-*.tgz)"
```

## Workflow behavior

- All checks in the Windows/Linux × Node 22.19/24 matrix must pass before publication.
- The release job uses Node 24 to build the archive, calculate its SHA-256 checksum, generate release notes with GitHub CLI, and upload the files.
- The release job uses the repository's `GITHUB_TOKEN` with `contents: write`; TypeSafe and npm credentials are not required.
- The workflow publishes to GitHub Releases. Publishing to the npm registry is a separate process.
- Runs for the same tag are serialized. An existing Release is not overwritten. After a failure, inspect the tag and Release state before retrying or publishing a fix version.

After downloading the assets, verify the checksum with `sha256sum -c SHA256SUMS`. On Windows, compare with `Get-FileHash -Algorithm SHA256 <file>`.
