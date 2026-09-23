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
| `src/core/`               | Request validation, dispatch, result validation, timeouts, and provider lifecycle |
| `src/providers/typesafe/` | TypeSafe plugin configuration, backend calls, and protocol mapping                |
| `examples/`               | Consumer and third-party provider examples                                        |
| `tests/`                  | Public contract, HTTP fixture, and lifecycle checks                               |
| `scripts/`                | Package checks and explicit backend/host probes                                   |
| `docs/en/`, `docs/zh-CN/` | English and Simplified Chinese API and release guides                             |

The generated `lib/` JavaScript, declarations, and source maps are committed so dsh can install this package directly from GitHub. The pre-commit hook runs `pnpm build` and stages the updated `lib/`. Stage build inputs before committing; the hook stops if it finds unstaged or untracked source changes that could make the generated output differ from the commit.

The hook uses the dev-only `simple-git-hooks` package. Its install script is approved in this repository's `pnpm-workspace.yaml` so `pnpm install` can register the maintainer hook. It is not part of the dsh runtime dependencies. Run `pnpm hooks:install` to refresh the hook after changing its configuration.

## Implementation guidelines

- Keep changes small and complete. Decide whether new behavior belongs to the foundation service, a provider, or a consumer plugin.
- Prefer mature dependencies for general-purpose behavior. When implementing custom infrastructure, document the specific contract or lifecycle guarantee existing libraries cannot provide.
- Use strict TypeScript, ESM, and `.js` relative import suffixes. Examples import through public package exports.
- Providers treat requests as read-only, honor `AbortSignal`, normalize results, and preserve the actual model and available usage data.
- Add focused checks for observable behavior and important regressions. Update examples and API docs when public contracts change.
- Keep errors safe to display. Do not put credentials, raw server response bodies, or user input in logs or test snapshots.

## Before submitting

```sh
pnpm verify
```

`verify` runs type checking, Node tests, a build, and an isolated tarball installation plus consumer compilation. Tests use local responses and do not need backend credentials. CI runs the same command on Windows and Linux with Node 22.19 and 24.

For host integration changes, the installed dsh `0.1.5-rc.2` can be used for a Loader probe:

```sh
pnpm build
pnpm probe:host <path-to-node_modules/@deepseek-ai/dsh/package.json>
```

For TypeSafe protocol changes, set up `.env.local` and explicitly run `pnpm probe:live`. It exits with code 2 when credentials are missing and code 1 when a question fails. A single response is an interface sample; latency and decision quality need evaluation in their actual use cases.

Describe the problem, behavior change, and verification in a pull request. Generated output, credentials, and local research records are ignored by Git, except the committed `lib/` output required for GitHub installation. See the [release process](docs/en/releasing.md).
