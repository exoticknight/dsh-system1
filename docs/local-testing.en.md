# Local services and live validation

[简体中文](local-testing.md) | [English](local-testing.en.md)

This page records reproducible model-service validation. `pnpm verify` checks contracts, builds, and package installation. Live model validation additionally requires a running backend and its probe. Probes use fixed synthetic inputs; one response proves connectivity and contract compatibility, not model quality or a latency benchmark.

## Isolated environments

Use a separate Python virtual environment for each model and a separate Node project for the test host. Development environments can live under the Git-ignored `.scratch/local-providers/` directory. Use the machine's existing toolchain and default caches. Bind local HTTP servers to `127.0.0.1`. On Windows, start background processes with hidden windows and record their PIDs and output/error logs.

When installing a DSH test host inside this repository, use pnpm's `--ignore-workspace` to keep its dependencies separate. For a first installation, run from the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force .scratch/local-providers/host | Out-Null
if (-not (Test-Path .scratch/local-providers/host/package.json)) {
  '{"name":"dsh-system1-host-probe","private":true,"version":"0.0.0"}' |
    Set-Content -Encoding utf8 .scratch/local-providers/host/package.json
}
pnpm --dir .scratch/local-providers/host add --ignore-workspace --save-exact @deepseek-ai/dsh@0.1.7-rc.2
```

If pnpm reports `ERR_PNPM_IGNORED_BUILDS`, inspect the installed package and skipped scripts before running the Loader probe separately. Record the installation exit code independently from the probe result. To run the probe:

```sh
pnpm build
pnpm probe:host <absolute-path-to-test-host/node_modules/@deepseek-ai/dsh/package.json>
```

This probe checks the actual Loader, registration of all three providers, pre-cancellation, and unloading. It does not perform model HTTP calls.

On Windows with pnpm links, the probe resolves the host manifest's real path before loading dependencies from that host's tree. The Loader probe passed against `0.1.7-rc.2` on 2026-10-05. Full dependency installation reported skipped native build scripts; this result verifies the Loader, not a full DSH application launch.

## TypeSafe

The [official instructions](https://docs.typesafe.ai/introduction/quickstart) describe the hosted API; there is currently no local Jev release deployable from those public instructions. Set `TYPESAFE_API_KEY` in `.env.local`, build, then run:

```sh
pnpm probe:live
```

On 2026-10-05, a real `jev-1.13.0` call passed the public contract for `noul`, `choice`, and `score` in approximately 997 ms. This is hosted inference evidence, not a local Jev deployment.

## Laya

Laya's [official server](https://github.com/NandhaKishorM/laya) implements `/v1/systemone` directly. CPU inference can run independently of a GPU model. Allow time for checkpoint downloads, cold starts, and CPU inference.

The tested environment uses Python 3.13, `laya[serve]==0.3.27`, and `torch==2.14.1+cpu`. From the repository root in PowerShell:

```powershell
python -m venv .scratch/local-providers/laya/.venv
& .scratch/local-providers/laya/.venv/Scripts/python.exe -I -m pip install 'torch==2.14.1+cpu' --index-url https://download.pytorch.org/whl/cpu
& .scratch/local-providers/laya/.venv/Scripts/python.exe -I -m pip install 'laya[serve]==0.3.27'
$env:LAYA_HOST = '127.0.0.1'
$env:LAYA_PORT = '8000'
$env:LAYA_DEVICE = 'cpu'
$env:LAYA_MODELS = 'multilingual'
$env:LAYA_PRELOAD = '1'
$env:LAYA_DEFAULT_MODEL = 'multilingual'
$env:LAYA_THREADS = '8'
$env:LAYA_MAX_LOADED = '1'
& .scratch/local-providers/laya/.venv/Scripts/laya-serve.exe
```

The server runs in the foreground; stop it with `Ctrl+C`. Check `loaded`, `revisions`, and `checkpoint_devices` at `http://127.0.0.1:8000/health`, then use another terminal:

```powershell
$env:LAYA_BASE_URL = 'http://127.0.0.1:8000'
$env:LAYA_MODEL = 'auto'
$env:LAYA_TIMEOUT_MS = '60000'
pnpm build
pnpm probe:laya
```

`LAYA_MODELS` controls preloading, not model availability. `LAYA_MODEL=auto` routes automatically and may lazily load other checkpoints. The Chinese fixture routed to `multilingual`. This release loads the `multilingual/` subdirectory of `convaiinnovations/laya` through the default Hugging Face cache. Health reported revision `7b928d828b7b0e022f929d9bd2e44165aa270148`. The probe reports the routed model, revision, device, three primitive distributions, and latency, then checks pre-cancellation, a short timeout, and unsupported models. Ending the client wait does not guarantee that server inference stops immediately.

The plugin prefers Laya's `routing.model` for `meta.executed.model`, falling back to the top-level `model`. This preserves the actual checkpoint rather than the generic server name `laya-rl-agent`.

On 2026-10-05, the configuration above completed a warm real plugin call in approximately 223 ms on an i5-13600KF with 32GB RAM. All three primitives, model metadata, and the three error-boundary checks passed. That session used a hidden background process with PID and stop information under `.scratch/local-providers/laya/`. The foreground commands above are for manual reproduction; do not start them on a port already occupied by the background service.

## Clef

The [official Clef-flash release](https://huggingface.co/Cloudflare/clef-flash) includes the backbone, joint schema head, and `systemone` inference function. Local validation must retain all three. A 10GB GPU requires evaluating quantization or offloading; record precision, weight revision, and runtime versions. An HTTP wrapper around official inference validates the local model and provider transport. Cloudflare Workers AI infrastructure requires separate cloud validation.

`scripts/local-clef/serve.py` uses FastAPI/Uvicorn for a thin HTTP wrapper. The official release exposes a Python decision function without a matching HTTP server, while generic chat inference does not implement the joint schema head's decision contract. Loading and quantization remain delegated to the official code, Transformers, and bitsandbytes; the wrapper does not implement inference or probability algorithms.

The server pins `Cloudflare/clef-flash` revision `17f0b0ad64efb65d273590632833508766b2aae6`. Its first launch downloads approximately 19.1GB of original weights into the default Hugging Face cache. The backbone uses local NF4 double quantization with BF16 computation; the joint head stays BF16. This precision and implementation should not be assumed equivalent to the hosted deployment.

Install and start from the repository root (CUDA 12.8 wheel, Windows/Python 3.13 setup):

```powershell
python -m venv .scratch/local-providers/cloudflare/venv
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I -m pip install -r scripts/local-clef/requirements.txt
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I scripts/local-clef/serve.py --device cuda:0 --port 8765
```

Use `--device cpu` for CPU placement in the same environment. After startup, run `pnpm build`, then `node scripts/probe-clef-local.mjs` in another terminal. It connects to `127.0.0.1:8765` by default; when changing the port, set both the server's `--port` and the probe's `CLEF_LOCAL_PORT`. The probe exercises the public service and Cloudflare adapter with all three primitives and probability distributions, using placeholder credentials without loading real Cloudflare tokens. Health is exposed at `/health`; inference uses `/client/v4/accounts/{account}/ai/run/@cf/cloudflare/clef-flash`.

These instructions currently record the runtime configuration. Full weight download and end-to-end model inference are still pending; local Clef integration is not yet verified.

This wrapper caps input length at 4096 tokens, and the probe allows 300 seconds. It does not emulate cloud quotas, authentication, or concurrency capabilities. Stop a foreground server with `Ctrl+C`. Real Workers AI validation still uses `pnpm probe:cloudflare` with valid cloud credentials.
