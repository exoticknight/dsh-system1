# 本地服务与真实联调

[简体中文](local-testing.md) | [English](local-testing.en.md)

本页记录模型服务的可复现验证方法。`pnpm verify` 检查项目契约、构建和安装；真实模型调用还需要启动对应后端并运行探针。探针使用固定的合成输入，单次响应仅证明接入链路，不代表模型质量或延迟基准。

## 环境隔离

为各模型创建独立 Python 虚拟环境，宿主使用独立 Node 项目。开发环境可放在被 Git 忽略的 `.scratch/local-providers/`。沿用机器既有工具链及默认缓存，不设置新的缓存或 store 位置。所有本地 HTTP 服务绑定 `127.0.0.1`；Windows 后台启动使用隐藏窗口，并保存 PID、标准输出与错误日志。

DSH 测试宿主安装在仓库内部时，使用 pnpm 的 `--ignore-workspace` 保持宿主依赖与插件项目独立。首次安装可在仓库根目录的 PowerShell 中执行：

```powershell
New-Item -ItemType Directory -Force .scratch/local-providers/host | Out-Null
if (-not (Test-Path .scratch/local-providers/host/package.json)) {
  '{"name":"dsh-system1-host-probe","private":true,"version":"0.0.0"}' |
    Set-Content -Encoding utf8 .scratch/local-providers/host/package.json
}
pnpm --dir .scratch/local-providers/host add --ignore-workspace --save-exact @deepseek-ai/dsh@0.1.7-rc.2
```

pnpm 可能报告 `ERR_PNPM_IGNORED_BUILDS`，应检查实际包是否已安装及被跳过的脚本，再单独运行 Loader 探针。不要将安装退出码与探针结果混为一谈。探针命令为：

```sh
pnpm build
pnpm probe:host <绝对路径到测试宿主/node_modules/@deepseek-ai/dsh/package.json>
```

该探针验证实际 Loader 加载、三个 provider 注册、预取消及卸载；模型 HTTP 调用需要分别验证。

Windows pnpm 使用链接目录，探针会先解析宿主 manifest 的真实路径，以便从该宿主自己的依赖树加载 Loader。2026-10-05 对 `0.1.7-rc.2` 的 Loader 探针已通过。该环境的完整安装报告了被跳过的原生构建脚本；这里只验证 Loader，不代表完整 DSH 应用启动成功。

同日还使用该安装版 Loader 加载 `cordis.patch.yml`，再由 `ctx.system1.decide` 请求 `laya/auto`：三原语均通过，实际执行 `multilingual`，约 488 ms；之后卸载 Loader，Laya 服务保持运行。此验收覆盖宿主 Loader → 插件 → 本地模型 HTTP 链路，脱敏记录位于 `.scratch/local-providers/host/live-laya-result.json`。

## TypeSafe

[官方文档](https://docs.typesafe.ai/introduction/quickstart)提供托管 API 接入方法，当前没有可按公开说明部署的 Jev 本地发行版。在 `.env.local` 中配置 `TYPESAFE_API_KEY`，构建后执行：

```sh
pnpm probe:live
```

2026-10-05 实测 `jev-1.13.0`：`noul`、`choice`、`score` 均通过公共契约，单次调用约 997 ms。该记录是云端真实推理，不能据此声称 Jev 已在本机部署。

## Laya

Laya 的[官方服务](https://github.com/NandhaKishorM/laya)直接实现 `/v1/systemone`。CPU 路线可与 GPU 模型分开运行；首次加载需要下载 checkpoint，并为冷启动和 CPU 推理设置足够超时。

本次环境为 Python 3.13、`laya[serve]==0.3.27`、`torch==2.14.1+cpu`。在仓库根目录的 PowerShell 中安装：

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

该命令在前台运行，`Ctrl+C` 停止。检查 `http://127.0.0.1:8000/health`，确认 `loaded`、`revisions`、`checkpoint_devices` 后，在另一终端运行：

```powershell
$env:LAYA_BASE_URL = 'http://127.0.0.1:8000'
$env:LAYA_MODEL = 'auto'
$env:LAYA_TIMEOUT_MS = '60000'
pnpm build
pnpm probe:laya
```

`LAYA_MODELS` 只控制预加载，不限制可调用模型。`LAYA_MODEL=auto` 会自动路由，可能懒加载其他 checkpoint。本轮中文输入路由到 `multilingual`。该版本从默认 Hugging Face 缓存加载 `convaiinnovations/laya` 的 `multilingual/` 子目录；健康检查记录 revision `7b928d828b7b0e022f929d9bd2e44165aa270148`。探针输出实际路由模型、版本、设备、三原语分布与耗时，并检查预取消、短超时和不支持模型；客户端结束等待不保证服务端推理立即停止。

插件优先使用 Laya 响应中的 `routing.model` 记录 `meta.executed.model`；没有路由字段时沿用顶层 `model`。这避免将通用服务名称 `laya-rl-agent` 当作实际 checkpoint。

2026-10-05，在 i5-13600KF、32GB RAM 上使用上述配置，预热后的真实插件调用约 223 ms；三原语、实际模型元数据及三个错误边界均通过。该机器当次会话使用隐藏后台进程，PID 和停止信息保存在 `.scratch/local-providers/laya/`；上方前台命令用于手工复现，不要与已启动的后台服务占用同一端口。

## Clef

Clef-flash 的[官方发行版](https://huggingface.co/Cloudflare/clef-flash)包含 backbone、joint schema head 和 `systemone` 推理函数。本地验证必须保留这三个部分。10GB GPU 需要评估量化或 offload；使用量化时应记录精度、权重 revision 和依赖版本。为官方推理函数增加的本地 HTTP 包装只验证本地模型和 provider 传输，Cloudflare Workers AI 云端基础设施仍需单独验证。

`scripts/local-clef/serve.py` 使用 FastAPI/Uvicorn 提供最薄的 HTTP 包装。选择它的原因是官方发行版提供 Python 决策函数，没有相应 HTTP 服务；普通聊天推理入口不包含 joint schema head 的决策契约。模型加载与量化仍使用官方代码、Transformers 和 bitsandbytes，不实现另一套推理或概率算法。

服务固定 `Cloudflare/clef-flash` revision `17f0b0ad64efb65d273590632833508766b2aae6`，首次启动下载约 19.1GB 原始权重到默认 Hugging Face 缓存。Backbone 使用本地 NF4 double quant，计算精度 BF16；joint head 保留 BF16。此结果与官方云端部署的精度及实现不应直接等同。

当前依赖固定为 PyTorch 2.11.0+cu128、torchvision 0.26.0+cu128、Transformers 5.18.0、tokenizers 0.23.1 和 bitsandbytes 0.50.2，其余精确版本见 requirements。官方示例提到的 Transformers 5.10.2 在本机无法解析该快照的 processor 配置；升级成熟依赖并补齐 torchvision 后，官方 `Qwen3VLProcessor` 已通过加载检查。

从仓库根目录安装并启动（CUDA 12.8 wheel，Windows/Python 3.13 配置）：

```powershell
python -m venv .scratch/local-providers/cloudflare/venv
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I -m pip install -r scripts/local-clef/requirements.txt
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I scripts/local-clef/serve.py --device cuda:0 --port 8765
```

本机 Hub 下载多次断连，因此改用支持网络错误重试及 Range 续传的 Git LFS。以下是独立部署产物目录的首次准备流程，不会搬迁 Hub 缓存；先安装 Git 与 Git LFS：

```powershell
$clefDir = '.scratch/local-providers/cloudflare/model'
$clefRevision = '17f0b0ad64efb65d273590632833508766b2aae6'
$previousSkipSmudge = $env:GIT_LFS_SKIP_SMUDGE
try {
  $env:GIT_LFS_SKIP_SMUDGE = '1'
  git clone --no-checkout https://huggingface.co/Cloudflare/clef-flash $clefDir
  git -C $clefDir fetch --depth=1 origin $clefRevision
  git -C $clefDir checkout --detach $clefRevision
} finally {
  $env:GIT_LFS_SKIP_SMUDGE = $previousSkipSmudge
}
git -C $clefDir -c lfs.concurrenttransfers=4 -c lfs.transfer.maxretries=12 -c lfs.basictransfersonly=true lfs fetch origin $clefRevision
git -C $clefDir lfs checkout
git -C $clefDir lfs fsck
& .scratch/local-providers/cloudflare/venv/Scripts/python.exe -I scripts/local-clef/serve.py --model-path $clefDir --device cuda:0 --port 8765
```

`--model-path` 启动前检查固定 Git 提交及 tracked 工作树清洁状态，使用该目录的官方代码与权重。先等待 LFS fetch、checkout 和完整性检查成功，再启动模型服务。

尽量让 fetch 连续运行并自行重试。Git LFS 3.7.1 在下载函数正常返回错误时保存可续传的 `.part`；Windows 强制中断可能只留下随机临时文件，不能保证下一进程自动复用。监控正在写入的文件时，以 Git LFS 进度或打开文件句柄获取的尺寸为准，Windows 目录列表可能滞后。

`--device cpu` 可选择 CPU 路线，沿用同一个环境。等待启动完成后，在另一终端先执行 `pnpm build`，再运行 `node scripts/probe-clef-local.mjs`；默认连接 `127.0.0.1:8765`，更改端口时同时设置服务 `--port` 与探针 `CLEF_LOCAL_PORT`。探针通过公共 service 和 Cloudflare adapter 验证三原语及概率分布，使用占位凭据，不读取真实 Cloudflare token。服务健康接口为 `/health`，推理入口为 `/client/v4/accounts/{account}/ai/run/@cf/cloudflare/clef-flash`。

当前上述内容记录运行配置；完整权重下载与模型端到端推理尚待完成，不能据此声称 Clef 本地联调已通过。

本地包装的输入长度上限为 4096 tokens，探针最长等待 300 秒；它没有模拟云端配额、认证或并发能力。前台服务使用 `Ctrl+C` 停止。真实 Workers AI 验证仍运行 `pnpm probe:cloudflare`，需要有效云端凭据。
