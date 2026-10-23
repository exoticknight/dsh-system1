+++
id = "E-12"
state = "evolve"
status = "accepted"
title = "新增 Nace.AI Drex Provider"
created = "2026-10-23"
based_on = ["R-6", "E-10"]
document_paths = ["README.md", "README.zh-CN.md", "docs/providers.en.md", "docs/providers.md", "docs/api.en.md", "docs/api.md", "docs/testing.en.md", "docs/testing.md"]
verified = true
+++

# E-12: 新增 Nace.AI Drex Provider

## Change

新增内置 `nace` provider，接入 Nace.AI Drex；保留现有 TypeSafe、Laya、Cloudflare 的默认模型、超时与行为。

- **使用官方 `nace-sdk` 作为 Nace API 客户端**，由一个薄的 DSH adapter 转换 provider 契约。通过 SDK 的 `fetch` 注入支持 fixture 测试，调用传入 DSH `AbortSignal`，禁用 SDK 自动重试，让 DSH 自己控制超时、取消和 fallback。项目 Node 范围（22.19+/24）高于 SDK 文档要求的 Node 20。
- 注册固定 API 根地址 `https://console.nace.ai`，调用 `POST /v1/systemone`。设置页将 API key 保存至 DSH credentials，credential ref / 环境变量名为 `NACE_API_KEY`；不把密钥放入普通配置、日志或模型目录。缺少密钥时在构造 SDK 前报 `unavailable`，并显式传入解析出的 key，避免 SDK 的隐式环境变量或旧 `DREX_API_KEY` fallback 改变凭据来源。可沿用项目现有 endpoint 覆盖方式。
- 模型目录 `NACE_MODELS` 固定列出 `drex-v1.5`、`drex-v2.0`、`drex-max`。建议使用 `drex-v2.0` 作该 provider 设置页首选项；不把会迁移的 `drex-latest` 当稳定目录项，也不更改整个服务现有默认 provider/model。
- 支持 `noul`、`choice`、`score`，不支持 `box`。把 DSH 的字符串描述原样传递；对象/数组描述使用紧凑 JSON 字符串化；保留 choice criterion 的 `null`。Nace score 的 `legend` 是有序数组，转换后交给共享响应归一化，确保 levels 与 probabilities 的索引顺序不变。Drex 概率会有四位小数舍入；Nace 专属归一化仅在总和偏差不超过逐项半个末位的最大累计误差时调整 `choice` / `score` 分布，使其符合 DSH 的单位和校验，不放宽其他 provider 的校验。
- `drex-max` 独占图像输入。优先以内联 data URL 发送；如果 Nace 按 UTF-8 序列化后的 `state`、`questions` 和非空 `images` 超过 4 MiB（不计顶层 `model`），按需用官方 SDK 上传足够的较大图像并以 `workspace_file` 引用，完成或失败后都尝试删除已上传文件。非 Max 模型收到 images 时在发请求前拒绝。文档须说明：上传文件默认保留 24 小时；主动删除不等于备份即时清除，备份移除最多需 35 天。
- 为 `nace` 设 60,000 ms provider 默认超时，以覆盖 Drex 最长 55 秒的推理等待。调整超时优先级为：请求显式值 > 用户显式配置的服务级值 > provider 默认值 > 现行 800 ms。将服务级 `timeoutMs` 的 schema default 移至引擎运行时 fallback，保证既有 provider 和未显式配置的旧调用仍是 800 ms；显式设为 800 ms 的用户设置仍优先。
- 注册设置页、模型列表与 alias 解析、插件 patch / provider 汇总、client provider 选择、provider locale、包子路径与模型导出；README、provider/API/testing 文档属于 E-12 的交付范围。加入 `nace` live probe 目标供显式授权后的手动验证；只保留一条可能计费的推理 POST，不发送 1 ms 超时探针。并更新 host Loader probe 检查四个内置 provider。
- 提供 `assets/provider-icons/nace.svg` 与 `dsh-system1/providers/nace/icon` 子路径，沿用现有 provider icon 约定；使用自制中性图形，不复制未经确认授权的品牌素材。

## Rationale

R-6 将 Nace 排在首轮托管测试的前列：它原生使用 `/v1/systemone`，且公开的新户测试额度足以做有代表性的评估。用户已表示 Nace API key 准备就绪，因此本 E 将 Nace 定为第一个新增 provider。

使用官方 SDK 而不是在共享 HTTP transport 上叠加一套专用上传协议，可直接利用其 System One 类型、取消、可替换 fetch、Nace 错误分类和文件生命周期。继续通过现有 provider adapter、模型目录与 DSH response contract 暴露功能；共享响应归一化扩展兼容 score legend 数组，并为 Nace 提供受限的四位小数分布修正，不复制一套 DSH answer mapper。Nace 官方说明概率总和会有舍入误差；首次授权实测返回的三等级分布总和为 1.0001，而 DSH 原始容差为 1e-5，导致合法 answer 被拒。Nace 专属按四位小数舍入误差上界归一化，可修复该响应而保持 DSH 全局校验严格。Node 版本满足 SDK 要求。

默认选择固定模型 ID，便于不同运行之间可复现，也避免 `drex-latest` 切换后模型和费用悄然变化。Provider 专属超时让 Nace 可完成其长请求，同时维持既有三个 provider 的 800 ms 默认语义。

## Acceptance

- `nace` 作为内置 provider 可从服务 registry 和设置页选择；key 优先使用 DSH credentials，再回退 `NACE_API_KEY`；缺少 key 时不调用 SDK；请求从不在客户端或日志暴露 key。
- `NACE_MODELS` 列出固定的 v1.5、v2.0、Max ID，并可通过正式 provider 子路径导出。UI 首选 `drex-v2.0`，全局默认仍保持 TypeSafe / `jev-latest`。
- adapter 将字符串及结构化描述稳定映射到 Nace 文本 schema；不支持的 `box` / 非 Max 图像输入在 HTTP 前报 `unsupported`。测试覆盖 `noul`、`choice`、`score`、空 criterion、结构化描述、score legend 数组映射，以及四位小数舍入导致的非单位概率和归一化。
- `describe()` 不宣称 Nace 有 `box`；提供标准模型 512 题、Max 16 题、Max choice/score 各 255、Max 图片格式/数量/字节上限，以及各模型的 state 和 row token 元数据。DSH 不带 Drex tokenizer，因此本地执行题数、选项、图片和 4 MiB 请求体限制；token 限制由 Nace 服务端执行，安全映射其 422 状态。Max 的跨题 token 总量、图片 40MP 等 DSH 无法本地描述的限制由 Nace 执行并返回安全 422。
- Max 图像请求在 4 MiB JSON body 内内联；超限时只用账号级上传文件引用，不上传到 workspace。测试覆盖上传成功、部分上传后失败、请求取消和正常完成时的删除路径；清理采用 best-effort 异步执行，不延长推理超时或覆盖推理结果/原始错误；清理失败通过 DSH provider logger 发出脱敏警告。Docs/UI 明确上传留存与备份删除周期。
- Nace SDK 错误映射保留安全的 HTTP 状态：402 余额/付款问题不重试，401/403 作为认证或权限失败，422 不重试，429 与 529/可重试 5xx 标为可重试；SDK retry 关闭，避免隐藏重复请求。API key、图片内容和完整上游响应体不进入日志或错误文案。
- timeout 优先级为请求 > 显式服务配置 > provider 默认 > 800 ms；不显式配置时现有 TypeSafe、Laya、Cloudflare 仍为 800 ms；Nace 为 60 秒；显式用户超时继续覆盖默认值。
- 定向 mock 测试覆盖认证、序列化、model pin、answer normalization、capabilities、超时/取消、错误分类和图片清理；包检查覆盖 Nace 子路径、locale/icon 和模型 exports。Nace GET `/v1/models` 可作为免费 live preflight；任何计费 POST smoke test 需用户另行明确授权，不把用户提供 key 解释为已授权消耗额度。

## Document synchronization

已将下列文档作为 E-12 的交付内容同步：

- `README.md` 与 `README.zh-CN.md`：增加 Nace provider 与探针入口，说明新的 provider 默认超时优先级。
- `docs/providers.en.md` 与 `docs/providers.md`：增加 Nace 凭据、固定模型、能力与图片限制、按需上传与留存周期、舍入概率的归一化边界，以及文本和图片调用示例；明确服务全局默认模型不变。
- `docs/api.en.md` 与 `docs/api.md`：更新公共图片附件上限、provider 子路径与模型目录导出、timeout 语义，记录 Nace 支持的原语及限制。
- `docs/testing.en.md` 与 `docs/testing.md`：增加 Nace fixture 测试和 hosted probe 配置；提供不消耗余额的 `GET /v1/models` 凭据预检，并提醒真实推理 POST 会使用账户额度。Nace live probe 跳过单独的短超时调用以避免第二笔计费请求。
- `scripts/probe/host.mjs` 与两份 testing 文档：将 host Loader 检查的 provider 数由三个更新为四个，Nace 未知模型校验不触发网络请求。

## Verification

- 用户于 2026-10-23 明确要求实现并完成测试，授权开始此 Evolve。
- 官方限制页确认请求体按 UTF-8 计量 `state`、`questions` 与 Max 非空 `images`，不计顶层 `model`；各版本 state / row token 上限分别为 131,072 / 139,264（v1.5）和 131,072 / 262,144（v2.0、Max）。DSH 没有 Drex tokenizer，E 的本地 token 校验改为暴露 capability 元数据并依赖 Nace 对 token 超限返回 422。
- DSH 公共请求 schema 原来最多允许 4 张图，需放宽到 8 张以接入 Max；现有 TypeSafe / Cloudflare 的更小限制仍由各自 `describe()` capabilities 执行。
- 已实现 Nace provider、模型目录、设置页、凭据配置、provider bundle / patch、locale、图标、公开包子路径、包检查、README/docs 和手动 live probe target。
- 文档与 live target 调整后初版 `pnpm verify` 通过：typecheck、测试 84/84、build、隔离安装的 package exports/types/Cordis mount 检查。授权实测发现 Drex 返回的 choice/score 概率因四位小数舍入可偏离 1；已添加 Nace 专属归一化、1.0001 修复用例和越界仍拒绝的回归用例。最终 `pnpm test nace` 11/11 通过，`pnpm verify` 86/86 通过。
- `pnpm probe:host` 使用兼容宿主 DSH `0.2.0-rc.2` 通过：实际 Loader 挂载服务、四个内置 provider 和 agent tool，验证真实 tool registry fallback 输出；整个 probe 不调用模型。`node --check scripts/probe/targets.mjs`、`node --check scripts/probe/host.mjs`、`git diff --check` 与 `red check --json` 均通过。
- 用户于 2026-10-23 明确授权实际验证并使用账户额度。修复后以固定模型 `drex-v2.0` 运行一次 live probe，成功完成 `noul`、`choice`、`score`；endpoint 为 `https://console.nace.ai`，往返 496 ms，服务报告输入/输出 92/175 tokens。验证 `preCancelled=cancelled`、未知模型 `unsupported`，按设计跳过另一次会计费的短超时探针。密钥仅由 Node `--env-file` 注入进程，未回显或写入仓库。
- Nace 图片清理在推理结束后 best-effort 异步进行；这避免清理耗时覆盖 60 秒推理预算。若以后要保证离开进程前完成远端清理，需要单独设计生命周期契约，当前行为与 E 的“尝试删除”要求一致。
- 双轴 code review（基线 `9ab7ee1`）未发现 spec 缺项、范围外行为或实现错误。Standards review 提出的 API/provider 文档同步缺口已由本次明确纳入 E-12 的文档改动解决。另有一项 Data Clumps 风格建议（请求体大小辅助函数重复传入 state/questions/images），不影响契约或验收。

## Open questions

- 大图像按需上传会受 Nace 留存政策约束。若用户数据策略禁止第三方暂存，需在调用路径禁用上传并把大于内联请求体的图片明确拒绝。默认仅在超出 Nace 4 MiB JSON 限制时使用账号级上传文件；正常内联图像请求不上传。

## Sources

- [Nace Drex models](https://console.nace.ai/docs/drex/reference/models)
- [Nace Drex request limits](https://console.nace.ai/docs/drex/reference/limits)
- [Nace question schema](https://console.nace.ai/docs/drex/guides/questions)
- [Nace response probability rounding](https://console.nace.ai/docs/drex/guides/reading-answers)
- [Drex Max image inputs and limits](https://console.nace.ai/docs/drex/guides/drex-max)
- [Nace TypeScript SDK](https://console.nace.ai/docs/developer-tools/typescript)
- [Nace SDK upload and delete methods](https://console.nace.ai/docs/developer-tools/typescript/uploads)
- [Nace SDK error types](https://console.nace.ai/docs/developer-tools/typescript/errors)
- [Nace data retention](https://console.nace.ai/docs/perception/data-retention)
