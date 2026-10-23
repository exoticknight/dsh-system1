# Contributing

[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md)

## Set up the project

Use Node.js 22.19+ in the 22.x line or Node.js 24, install the pnpm version declared in `package.json`, then run:

```sh
pnpm install --frozen-lockfile
pnpm hooks:install
pnpm verify
```

Use the machine's existing toolchain and default cache locations. Submit changes to `package.json` and `pnpm-lock.yaml` together when dependencies change.

## Project structure

| Path                      | Responsibility                                                                    |
| ------------------------- | --------------------------------------------------------------------------------- |
| `src/index.ts`            | Cordis service, configuration, and Context declaration                            |
| `src/contracts/`          | Public types shared by consumers and providers                                    |
| `src/core/`               | Request validation, dispatch, result validation, timeout enforcement, and provider lifecycle |
| `src/providers/`          | Provider plugins (`typesafe`, `laya`, `cloudflare`) and the shared System One HTTP transport |
| `examples/`               | Consumer and third-party provider examples                                        |
| `tests/plugin/`           | Service contract and lifecycle tests with fake providers                          |
| `tests/providers/`        | Per-provider protocol, error, and mount tests with local HTTP fixtures; `clef-local/` holds the local Clef test service |
| `tests/shared/`           | Shared transport tests that do not belong to one provider                          |
| `scripts/`                | Build and package checks; `probe/` holds live model and host probes |
| `docs/`                    | Chinese API and release guides; English versions use the `.en.md` suffix         |

The generated `lib/` JavaScript, declarations, and source maps are committed so dsh can install this package directly from GitHub. The pre-commit hook runs `pnpm build` and stages the updated `lib/`. Stage build inputs before committing; the hook stops if it finds unstaged or untracked source changes that could make the generated output differ from the commit.

The hook tracks `src/`, package manifests, and the TypeScript configuration files used by the production build: `tsconfig.json`, `tsconfig.client.json`, and `tsconfig.build.json`. It uses the dev-only `simple-git-hooks` package. Its install script is approved in this repository's `pnpm-workspace.yaml` so `pnpm install` can register the maintainer hook. It is not part of the dsh runtime dependencies. Run `pnpm hooks:install` to refresh the hook after changing its configuration.

## Implementation guidelines

- Keep changes small and complete. Decide whether new behavior belongs to the foundation service, a provider, or a consumer plugin.
- Prefer mature dependencies for general-purpose behavior. When implementing custom infrastructure, document the specific contract or lifecycle guarantee existing libraries cannot provide.
- Use strict TypeScript, ESM, and `.js` relative import suffixes. Examples import through public package exports.
- Providers treat requests as read-only, honor `AbortSignal`, normalize results, and preserve the actual model and available usage data.
- A provider change must not modify `src/core/**`, public contract types, or shared-schema numeric values. If a provider needs new shared semantics, open a separate Evolve record for that contract change.
- Add focused checks for observable behavior and important regressions. Update examples and API docs when public contracts change.
- Keep errors safe to display. Do not put credentials, raw server response bodies, or user input in logs or test snapshots.

## Before submitting

```sh
pnpm verify
```

`verify` runs type checking, plugin and provider tests, a build, and an isolated tarball installation plus consumer compilation. Tests use local responses and do not need backend credentials. CI runs the same command on Windows and Linux with Node 22.19 and 24.

Review checklist: confirm provider-only work leaves `src/core/**`, public contract types, and shared-schema numeric values unchanged. If one of these changes is required, review it as a separate contract Evolve change.

Host integration follows the DSH range `>=0.1.7-rc.1 <0.3.0`. Exact releases verified so far, including `0.2.1-rc.2`, are listed as `compatible` in `dsh.compatibility.dshReleases`; run the Loader probe with one of those releases:

```sh
pnpm build
pnpm probe:host <path-to-node_modules/@deepseek-ai/dsh/package.json>
```

When changing a provider's protocol, also run `pnpm test <provider>` and its live probe, `pnpm probe <target>`, as described in [testing and live model validation](docs/testing.en.md). Run `pnpm test shared` when changing the shared System One transport. A single response is an interface sample; latency and decision quality need evaluation in their actual use cases.

Describe the problem, behavior change, and verification in a pull request. Generated output, credentials, and local research records are ignored by Git, except the committed `lib/` output required for GitHub installation. See the [release process](docs/releasing.en.md).
