# 测试与真实模型验证

[简体中文](testing.md) | [English](testing.en.md)

本项目的检查分三层。前两层不需要凭据或模型服务，由 `pnpm verify` 和 CI 运行；第三层显式调用真实模型。

| 层级 | 命令 | 覆盖范围 |
| --- | --- | --- |
| 插件测试 | `pnpm test plugin` | 服务契约、输入与结果校验、总预算、取消、provider 注册与卸载。使用假 provider，不涉及任何后端协议 |
| Provider 测试 | `pnpm test providers` | 各 adapter 的请求格式、响应归一化、错误脱敏、凭据缺失、插件挂载与卸载。使用本地 HTTP fixture 或替换的 `fetch` |
| 真实模型探针 | `pnpm probe <target>` | 通过公共服务和 provider 插件入口调用真实模型 |

`pnpm test` 运行前两层；`pnpm test <provider>` 只运行某个 provider，例如 `pnpm test laya`，可同时指定多个。测试文件位于 `tests/plugin/` 与 `tests/providers/<provider>.test.ts`；新增 provider 时添加对应的 provider 测试文件。

## 真实模型探针

探针读取已构建的 `lib/`，先运行 `pnpm build`，再运行 `pnpm probe <target>`。凭据从仓库根目录的 `.env.local` 读取，该文件被 Git 忽略，探针不会输出凭据值。DSH 插件本身只读取 DSH credentials 或进程环境，不读取 `.env.local`。

| Target | 类型 | 需要 | 可选环境变量 |
| --- | --- | --- | --- |
| `typesafe` | 托管 API | `TYPESAFE_API_KEY` | `TYPESAFE_MODEL`，默认 `jev-1.13.0` |
| `cloudflare` | 托管 API | `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` | `CLOUDFLARE_MODEL`，默认 `clef-flash` |
| `laya` | 本地服务 | Python；首次运行自动准备 | `LAYA_BASE_URL`、`LAYA_MODEL`（默认 `auto`）、`LAYA_TIMEOUT_MS`、`LAYA_API_KEY` |
| `clef-local` | 本地服务 | Python、Git LFS；首次运行自动准备 | `CLEF_LOCAL_PORT`（默认 `8765`）、`CLEF_DEVICE` |

每个探针都检查：

- `noul`、`choice`、`score` 三道题均为 `ok`，概率在 [0, 1] 内，分布之和为 1；
- 服务报告实际执行的 provider 与模型；
- 预取消返回 `cancelled`，未知模型在网络调用前返回 `unsupported`，1 ms 预算返回 `timeout`。`clef-local` 跳过超时检查，避免留下长时间运行的 CPU 推理。

本地服务还会检查 `/health`：`laya` 要求实际模型是服务已加载的 checkpoint，并输出 revision 与设备；`clef-local` 要求固定的权重 revision 并输出量化信息。

退出码：`0` 通过，`1` 结果不符合契约或调用失败，`2` 缺少配置。单次响应只证明调用链路可用，不代表模型质量或延迟基准。

## 宿主 Loader 探针

在独立目录安装 `dsh.compatibility.dshReleases` 中列出的 DSH 版本，然后运行：

```sh
pnpm build
pnpm probe:host <绝对路径到测试宿主/node_modules/@deepseek-ai/dsh/package.json>
```

它通过实际 Loader 加载 `cordis.patch.yml`，验证三个 provider 注册、`system1_decide` 工具在宿主真实工具注册表中注册和调用、各组件在插件页显示的中英文标题和描述、预取消和卸载，不调用模型。仓库内安装测试宿主时使用 pnpm 的 `--ignore-workspace`：

```powershell
New-Item -ItemType Directory -Force .scratch/local-providers/host | Out-Null
if (-not (Test-Path .scratch/local-providers/host/package.json)) {
  '{"name":"dsh-system1-host-probe","private":true,"version":"0.0.0"}' |
    Set-Content -Encoding utf8 .scratch/local-providers/host/package.json
}
pnpm --dir .scratch/local-providers/host add --ignore-workspace --save-exact @deepseek-ai/dsh@0.2.0-rc.2
```

pnpm 可能报告 `ERR_PNPM_IGNORED_BUILDS`。Loader 探针不依赖被跳过的原生构建脚本，应检查包是否已安装后单独运行探针。

## Cloudflare 凭据

Workers AI 免费额度为每天 10,000 Neurons，Workers Free 与 Paid 计划都有，不需要绑定付款方式。`clef-flash` 约 8,182 Neurons / 百万输入 tokens，一次探针约几百 tokens。免费计划超出额度时请求失败而不扣费。价格见 [Workers AI 定价](https://developers.cloudflare.com/workers-ai/platform/pricing/)。

1. 打开 [Workers AI 控制台](https://dash.cloudflare.com/?to=/:account/ai/workers-ai)，选择 **Use REST API**。
2. 选择 **Create a Workers AI API Token**，保留预填权限（`Workers AI - Read`、`Workers AI - Edit`），创建并复制 token。
3. 在同一页面复制 Account ID。
4. 写入 `.env.local`：

   ```
   CLOUDFLARE_ACCOUNT_ID=<Account ID>
   CLOUDFLARE_API_TOKEN=<token>
   ```

5. 运行 `pnpm build`，再运行 `pnpm probe cloudflare`。`CLOUDFLARE_MODEL=clef` 可验证完整版模型。

## 本地服务

`pnpm probe laya` 和 `pnpm probe clef-local` 按需准备环境，只准备被测 target 所需的内容：

1. 端点已有服务应答 `/health` 时直接使用，等待模型加载完成，探针结束后不停止它。
2. 否则（仅限 `127.0.0.1`/`localhost`）：虚拟环境不存在时创建并安装固定依赖；模型不存在时在此时下载；随后在后台启动服务，日志写入 `serve.log`，就绪后探测，结束后停止服务。

所有内容位于被 Git 忽略的 `.scratch/local-providers/<laya|cloudflare>/`，沿用工具默认缓存位置，服务只绑定 `127.0.0.1`。`PYTHON` 可指定创建虚拟环境用的解释器。

### Laya

[官方服务](https://github.com/NandhaKishorM/laya)直接实现 `/v1/systemone`。固定依赖为 `laya[serve]==0.3.27` 与 `torch==2.14.1+cpu`，已在 Python 3.13 上验证。服务以 CPU 启动（`LAYA_DEVICE` 可改），预加载 `multilingual`；官方服务首次启动时自行下载 checkpoint。探针使用中文样例，`auto` 路由到该 checkpoint；其他模型可能被懒加载。

Laya 响应顶层的 `model` 是服务名 `laya-rl-agent`，插件优先使用 `routing.model` 作为实际执行模型。

### Clef

[官方 Clef-flash 发行版](https://huggingface.co/Cloudflare/clef-flash)提供权重和 Python 决策函数，没有 HTTP 服务。`tests/providers/clef-local/serve.py` 是复刻 Workers AI REST 路径的薄包装，backbone 使用 NF4 double quant（计算精度 BF16），joint schema head 保留 BF16。本地结果与云端部署的精度和实现不等同，云端仍用 `pnpm probe cloudflare` 验证。

同一个 `cloudflare` provider 可连接本地包装：`baseURL` 设为 `http://127.0.0.1:8765/client/v4`，Account ID 和 token 填任意占位值。需要同时使用云端与本地时，以不同 `id` 挂载两份。

- 依赖：`tests/providers/clef-local/requirements.txt`（CUDA 12.8 wheel，Windows/Python 3.13）。
- 模型：固定 revision `17f0b0ad64efb65d273590632833508766b2aae6`，原始权重约 19 GB。首次探针用 Git LFS 下载到 `.scratch/local-providers/cloudflare/model`，支持断点续传，需要预先安装 Git LFS。下载完成后权重在工作区和 `.git/lfs` 中各占一份，约需 40 GB；`lfs fsck` 通过后可删除 `model/.git/lfs/objects` 释放约一半空间，之后无法再用 `lfs fsck` 校验。
- 设备：默认 `cpu`，`CLEF_DEVICE=cuda:0` 使用 GPU，需要足够显存。

服务本身从不下载权重，`--model-path`（或 `CLEF_MODEL_PATH`）必填，启动前检查固定提交和代码、配置文件的清洁状态。手动运行：

```powershell
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I tests/providers/clef-local/serve.py --model-path .scratch/local-providers/cloudflare/model --device cpu --port 8765
```

CPU 加载约 1 分钟，单次推理约 1 分钟，探针最长等待 300 秒。包装的输入上限为 4096 tokens，不模拟云端配额、认证或并发。

## TypeSafe

[官方文档](https://docs.typesafe.ai/introduction/quickstart)只提供托管 API，没有可部署的 Jev 本地发行版。在 `.env.local` 中设置 `TYPESAFE_API_KEY` 后运行 `pnpm probe typesafe`。
