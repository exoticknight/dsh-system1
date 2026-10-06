# Testing and live model validation

[简体中文](testing.md) | [English](testing.en.md)

Checks come in three layers. The first two need no credentials or model services and run in `pnpm verify` and CI. The third calls real models explicitly.

| Layer | Command | Coverage |
| --- | --- | --- |
| Plugin tests | `pnpm test plugin` | Service contract, input and result validation, total budget, cancellation, provider registration and unload. Uses fake providers and no backend protocol |
| Provider tests | `pnpm test providers` | Each adapter's request shape, response normalization, error sanitization, missing credentials, and plugin mount/unmount. Uses local HTTP fixtures or an injected `fetch` |
| Live model probes | `pnpm probe <target>` | Calls a real model through the public service and the provider plugin entry |

`pnpm test` runs the first two layers; `pnpm test <provider>` runs a single provider, for example `pnpm test laya`, and accepts several names. Tests live in `tests/plugin/` and `tests/providers/<provider>.test.ts`; add a provider test file with each new provider.

## Live model probes

Probes load the built `lib/`, so run `pnpm build` first, then `pnpm probe <target>`. Credentials come from `.env.local` at the repository root. Git ignores that file, and probes never print credential values. The DSH plugin itself reads DSH credentials or the process environment, not `.env.local`.

| Target | Kind | Requires | Optional environment |
| --- | --- | --- | --- |
| `typesafe` | Hosted API | `TYPESAFE_API_KEY` | `TYPESAFE_MODEL`, default `jev-1.13.0` |
| `cloudflare` | Hosted API | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | `CLOUDFLARE_MODEL`, default `clef-flash` |
| `laya` | Local service | Python; prepared automatically on first run | `LAYA_BASE_URL`, `LAYA_MODEL` (default `auto`), `LAYA_TIMEOUT_MS`, `LAYA_API_KEY` |
| `clef-local` | Local service | Python and Git LFS; prepared automatically on first run | `CLEF_LOCAL_PORT` (default `8765`), `CLEF_DEVICE` |

Every probe checks that:

- the `noul`, `choice`, and `score` questions are all `ok`, with probabilities in [0, 1] and distributions summing to 1;
- the service reports the provider and model that actually ran;
- a pre-cancelled call returns `cancelled`, an unknown model returns `unsupported` before network I/O, and a 1 ms budget returns `timeout`. `clef-local` skips the timeout check to avoid leaving long CPU inference running.

Local targets also check `/health`. `laya` requires the executed model to be a checkpoint loaded by the service and reports its revision and device; `clef-local` requires the pinned weight revision and reports quantization details.

Exit codes: `0` verified, `1` the result failed the contract or the call failed, `2` configuration is missing. A single response proves the integration path, not model quality or a latency benchmark.

## Host Loader probe

Install a DSH release listed in `dsh.compatibility.dshReleases` in a separate directory, then run:

```sh
pnpm build
pnpm probe:host <absolute-path-to-test-host/node_modules/@deepseek-ai/dsh/package.json>
```

It loads `cordis.patch.yml` through the real Loader and checks the three provider registrations, pre-cancellation, and unload without calling a model. When installing the test host inside the repository, use pnpm's `--ignore-workspace`:

```powershell
New-Item -ItemType Directory -Force .scratch/local-providers/host | Out-Null
if (-not (Test-Path .scratch/local-providers/host/package.json)) {
  '{"name":"dsh-system1-host-probe","private":true,"version":"0.0.0"}' |
    Set-Content -Encoding utf8 .scratch/local-providers/host/package.json
}
pnpm --dir .scratch/local-providers/host add --ignore-workspace --save-exact @deepseek-ai/dsh@0.1.7-rc.2
```

pnpm may report `ERR_PNPM_IGNORED_BUILDS`. The Loader probe does not depend on the skipped native build scripts; confirm the packages are installed and run the probe separately.

## Cloudflare credentials

Workers AI includes 10,000 free Neurons per day on both the Workers Free and Paid plans, with no payment method required. `clef-flash` costs about 8,182 Neurons per million input tokens, and one probe uses a few hundred tokens. On the Free plan, requests beyond the allocation fail rather than incur charges. See [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

1. Open the [Workers AI dashboard](https://dash.cloudflare.com/?to=/:account/ai/workers-ai) and choose **Use REST API**.
2. Choose **Create a Workers AI API Token**, keep the prefilled permissions (`Workers AI - Read`, `Workers AI - Edit`), then create and copy the token.
3. Copy the Account ID from the same page.
4. Add both to `.env.local`:

   ```
   CLOUDFLARE_ACCOUNT_ID=<Account ID>
   CLOUDFLARE_API_TOKEN=<token>
   ```

5. Run `pnpm build`, then `pnpm probe cloudflare`. Set `CLOUDFLARE_MODEL=clef` to check the full model.

## Local services

`pnpm probe laya` and `pnpm probe clef-local` prepare what they need on demand, and only for the target being probed:

1. If a service already answers `/health` at the endpoint, the probe uses it, waits for the model to load, and leaves it running afterwards.
2. Otherwise (only for `127.0.0.1`/`localhost`), the probe creates the virtual environment with pinned dependencies if missing, downloads the model if missing, starts the service in the background with logs in `serve.log`, probes it once ready, and stops it afterwards.

Everything lives in the Git-ignored `.scratch/local-providers/<laya|cloudflare>/`, tools keep their default cache locations, and services bind only to `127.0.0.1`. Set `PYTHON` to choose the interpreter used to create virtual environments.

### Laya

The [official service](https://github.com/NandhaKishorM/laya) implements `/v1/systemone` directly. Pinned dependencies are `laya[serve]==0.3.27` and `torch==2.14.1+cpu`, verified on Python 3.13. The service runs on CPU (override with `LAYA_DEVICE`) and preloads `multilingual`; the official service downloads its checkpoint on first start. The probe uses a Chinese sample, so `auto` routes to that checkpoint; other models may load lazily.

The top-level `model` in a Laya response is the service name `laya-rl-agent`; the plugin prefers `routing.model` as the executed model.

### Clef

The [official Clef-flash release](https://huggingface.co/Cloudflare/clef-flash) ships weights and a Python decision function, but no HTTP service. `tests/providers/clef-local/serve.py` is a thin wrapper that mirrors the Workers AI REST route. The backbone uses NF4 double quantization with BF16 compute, and the joint schema head stays in BF16. Local results are not equivalent to the cloud deployment's precision or implementation; validate the cloud with `pnpm probe cloudflare`.

The same `cloudflare` provider can target the local wrapper: set `baseURL` to `http://127.0.0.1:8765/client/v4` and use any placeholder Account ID and token. To use cloud and local together, mount it twice with different `id` values.

- Dependencies: `tests/providers/clef-local/requirements.txt` (CUDA 12.8 wheels, Windows/Python 3.13).
- Model: pinned revision `17f0b0ad64efb65d273590632833508766b2aae6`, about 19 GB of raw weights. The first probe downloads it with Git LFS into `.scratch/local-providers/cloudflare/model`, with resumable transfers; Git LFS must be installed. Afterwards the weights exist both in the working tree and in `.git/lfs`, about 40 GB in total. Once `lfs fsck` passes, deleting `model/.git/lfs/objects` frees about half of that, but `lfs fsck` can no longer verify the weights.
- Device: `cpu` by default; `CLEF_DEVICE=cuda:0` uses the GPU and needs enough VRAM.

The service itself never downloads weights: `--model-path` (or `CLEF_MODEL_PATH`) is required, and startup checks the pinned commit and that code and configuration files are clean. To run it manually:

```powershell
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I tests/providers/clef-local/serve.py --model-path .scratch/local-providers/cloudflare/model --device cpu --port 8765
```

On CPU, loading takes about a minute and one inference about a minute; the probe waits up to 300 seconds. The wrapper caps input at 4096 tokens and does not emulate cloud quotas, authentication, or concurrency.

## TypeSafe

The [official documentation](https://docs.typesafe.ai/introduction/quickstart) offers a hosted API only, with no deployable local Jev release. Set `TYPESAFE_API_KEY` in `.env.local` and run `pnpm probe typesafe`.
