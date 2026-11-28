# 模型服务配置

[简体中文](providers.md) | [English](providers.en.md)

在 **System One** 设置的**操作**区，选择某项操作的标签页来设置主模型和备用顺序。从 DSH 的**组件**列表打开对应服务商子插件，在**连接设置**中修改端点、密钥和可选的 `timeoutMs`，或在**模型与能力**中查看该实例支持的输入及已使用它的路由。使用同一实例的操作共享连接设置。

模型按已保存的路由显示「定位 · 主模型」「定位 · 备用 2」等位置；备用序号按整条路由计算，不因更换服务商而重新编号。没有加入任何已保存路由的模型显示「未被选用」。这些专用页面对应随包提供的组件行；修改行内的实例 `id` 仍可用原入口，另行添加的组件行由其插件自行提供设置页。

操作启用后，调用方可通过 `model: { provider, model }` 临时选模。每个模型都获得完整超时预算，包括能力检查和 HTTP 调用。超时依次取调用指定的 `timeoutMs`、所选 provider 的超时设置及其默认值。留空即用默认值。本地模型首次加载和 CPU 推理需要更长的预算时，可调高超时。详见[备用模型](api.md#备用模型)。

| Provider | 模型 | 默认超时 | 默认服务地址 | 凭据引用 |
| --- | --- | ---: | --- | --- |
| `typesafe` | `jev-latest`、`jev-preview`、`jev-1.14.0`、`jev-1.13.0` | 800 ms | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`、`english`、`multilingual`、`typed-decisions` | 800 ms | `http://127.0.0.1:8000` | `LAYA_API_KEY`，可选 |
| `meragpt` | `decider-1`、`decider-1.1` | 10,000 ms | `https://meragpt.com` | `MERAGPT_API_KEY` |
| `liquid` | `d1.2`、`d1.2-ultra` | 10,000 ms | `https://api.liquid.ai/decisions` | `LIQUID_API_KEY` |
| `nace` | `drex-max-v1.2`、`drex-max-finance`（托管） | 60,000 ms | `https://console.nace.ai` | `NACE_API_KEY` |
| `cloudflare` | `clef`、`clef-flash`、`clef-omni` | 800 ms | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

`jev-1.14.0` 和 `jev-1.13.0` 是固定版本。`jev-latest` 指向最新稳定版，`jev-preview` 指向最新发布版；别名映射会随 TypeSafe 更新。需要固定行为时选择版本 ID。详见 TypeSafe 的[模型目录](https://docs.typesafe.ai/models)。

provider 模型目录与能力由本项目显式维护，不会在运行时自动覆盖。跟进上游更新时，先核对官方 changelog、模型页或 schema 的模型 ID、输入格式与限制，再更新对应 provider 的模型目录、能力声明、传输 fixture 和中英文文档；动态别名只跟随模型名称，不代表新能力已同步。价格等上游可变信息不纳入产品契约。

密钥优先通过 DSH credentials 服务解析；宿主没有该服务时读取进程环境。密钥不会回显。在服务组件的设置页填写 API Key 后，与连接参数一起点「保存设置」写入 DSH 凭据存储；留空保存会保留已有密钥。设置页仅在当前值与包默认值不同时显示「已覆盖」，「恢复默认值」会写回包默认值。各独立 provider 插件可用 `id` 和 `apiKeyEnv` 自定义注册名及凭据引用。

## 本地部署范围

启动、复测与验证边界见[测试与真实模型验证](testing.md)。

Laya 提供[官方本地 HTTP 服务](https://github.com/NandhaKishorM/laya)，可直接接入本插件的 `/v1/systemone` 传输。Laya 0.5.6 已通过 CPU 上的中文多语言探针。Cloudflare 发布了 [Clef-flash 权重和决策推理代码](https://huggingface.co/Cloudflare/clef-flash)；本地运行需要同时加载 backbone 和 joint schema head，普通聊天模型服务不能替代该决策接口。仓库提供的本地包装复刻 Workers AI REST 路径，同一个 `cloudflare` provider 将 `baseURL` 指向本地即可使用；本地 Clef 推理与 Cloudflare Workers AI 云端接口需要分别验证。

TypeSafe 的[公开部署说明](https://docs.typesafe.ai/introduction/quickstart)目前提供托管 API；[模型文档](https://docs.typesafe.ai/models)未提供可据此部署的 Jev 本地发行版。本项目通过真实托管调用验证 TypeSafe，不将本地协议模拟计作 Jev 本地推理。

### Chinese Decision 0.8B（可选本地 provider）

先用 [上游 CPU / GGUF 说明](https://github.com/yanqiangmiffy/chinese-decision#readme)启动 Chinese Decision 0.8B Q8_0 HTTP 服务，再显式挂载 `dsh-system1/providers/chinese-decision`。默认连接 `http://127.0.0.1:8787`，不改现有默认路由。调用时指定 `{ provider: 'chinese-decision', model: 'chinese-decision-0.8b' }`，完整示例见 [chinese-decision.mjs](../examples/chinese-decision.mjs)。

支持文本 `noul`、`choice`、`score`。每次最多 64 题，choice／score 每题 2–26 项，score 档位描述使用字符串。每题连同共享 state 编译后的输入最多 16,384 tokens。默认超时 10 秒，批量题较多时按本机实测调大。建议先用实际中文样本做离线或影子评估，再决定是否用于生产路由。

### Jev 图片、Box 与长上下文

公共请求结构设有资源安全上限：每种附件最多 16 项，单项最多 16 MiB，所有附件解码后合计最多 64 MiB；模型能力可以更严格。Jev 最多支持 4 张 PNG/JPEG 图片，每张最多 16 MiB、总计最多 16 MiB；图片会被编码为 TypeSafe `assets` 并自动发送 `TypeSafe-Danger-Zone-Images` 请求头。TypeSafe 将图片和 Box 标为实验能力，格式、限制和准确性可能随版本变化。Jev 1.14（或当前映射到 1.14 的 `jev-preview`）支持 `box`，结果中的四条边是 0–1 之间的归一化坐标。通过 `longContext: true` 可显式请求 262k tokens；默认仍按每请求 64k、每题 32k 的常规上限执行。详见[TypeSafe 图片说明](https://docs.typesafe.ai/images)、[Box 说明](https://docs.typesafe.ai/primitives/box)和[上下文限制](https://docs.typesafe.ai/models#long-context)。

## Nace.AI Drex

在 DSH 的 `nace` provider 设置页保存 API Key，凭据引用为 `NACE_API_KEY`。没有 DSH credentials 服务时，插件读取同名进程环境变量。使用官方 API 根地址 `https://console.nace.ai` 时，新选 Nace 首选 `drex-max-v1.2`；服务全局默认仍是 TypeSafe 的 `jev-latest`。创建或轮换 key 见 Nace 的[身份验证说明](https://console.nace.ai/docs/drex/guides/authentication)。

| 托管模型 | 每次请求题数 | Token 限制 | 图片 |
| --- | ---: | --- | --- |
| `drex-max-v1.2` | 512 | 整份请求最多 262,144 tokens，包含 state、所有问题、图片和格式标记 | 最多 8 张 |
| `drex-max-finance` | 512 | 同为整份请求 262,144 tokens；金融模型使用独立服务容量 | 最多 8 张 |

在官方端点上，已有默认、备用路由和显式调用中的 `drex-v2.0`、`drex-max-v1.1` 继续有效。插件用 `drex-max-v1.2` 发起请求，已保存的 ID 保持原样。**原先首选 `drex-v2.0` 的图片请求现在可能发给 Nace，而不再跳到原图片备用模型。** 如果图片应交给别的 provider，请在升级后检查有效路由并调整顺序。若托管调用仍使用 `drex-v1.5` 或 `drex-max`，请改选 `drex-max-v1.2`。

如果通过 `baseURL` 接入兼容服务，按该部署选择模型：插件保留原来的 `drex-v2.0`（仅文本）、`drex-max-v1.1` 和 `drex-max-finance` 目录，按所选原 ID 发送请求。

Drex 可能把 `choice` 或 `score` 分布中的每项概率舍入到四位小数，因此总和可能略高于或低于 1。DSH 仅在偏差不超过逐项舍入的最大误差时重新归一化；更大的偏差仍按常规答案校验规则处理。

`drex-max-v1.2` 和 `drex-max-finance` 均支持 PNG、JPEG、WebP（最多 8 张、每张 16 MiB、总计 32 MiB、单图最高 4,000 万像素），每题最多 255 个 `choice` 选项或 `score` 等级。Nace 执行表中的 token 上限。

Nace 将序列化后的 UTF-8 JSON 请求体限制为 4 MiB，计入 `state`、`questions` 和非空 `images`，但不计顶层 `model`。小图以内联方式发送；内联图像会超出请求体上限时，adapter 只上传足够数量的图片并传递账号级文件引用，不使用 workspace。推理结束后 adapter 会尝试删除上传文件；清理失败时，Nace 默认在 24 小时后清除账号级上传，已删除文件的备份最多还需 35 天清除。对不允许临时上传到第三方服务的图片，不要使用该路径。详见 Nace 的[模型目录](https://console.nace.ai/docs/drex/reference/models)、[请求限制](https://console.nace.ai/docs/drex/reference/limits)、[Drex Max 图片说明](https://console.nace.ai/docs/drex/guides/drex-max)和[数据留存政策](https://console.nace.ai/docs/perception/data-retention)。

单次调用可指定 Nace，不改变服务默认模型：

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-max-v1.2' },
  state: '客户称退款已等待两周，并请求帮助。',
  questions: {
    refund: { type: 'noul', instructions: '客户是否在询问退款？' },
  },
})
```

托管图片输入请选择 `drex-max-v1.2` 或 `drex-max-finance`，并使用请求共享的 `images` 字段：

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-max-v1.2' },
  state: '请检查图片 1。',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  questions: {
    damaged: { type: 'noul', instructions: '图片 1 中的物品是否损坏？' },
  },
})
```

发送真实请求前，先查看[测试与真实模型验证](testing.md#nace-凭据与真实探针)。

### 文本与图片定位

同一连接也可用于[定位](locate.md)：`drex-max-locate` 查找文本片段（原文最多 28,000 个 Unicode 码点）；`drex-max-box` 查找一张 PNG、JPEG 或 WebP 上的区域（内联 data URL 最多 4,000,000 字符）。两者都将去掉首尾空白后的指令限制在 4,000 个码点；编码输入的 32,768-token 预算由 Nace 执行。定位专用端点不会上传临时文件，能否调用取决于部署和账号。账号启用 Zero retention 或缺少推理权限时，端点返回 `403`；收到该状态后会立即停止兜底。见 [Nace Locate 与 Box 指南](https://console.nace.ai/docs/drex/guides/locate-and-box)。

## meraGPT Decider 1.1

在 `meragpt` 设置页保存 API Key，凭据引用为 `MERAGPT_API_KEY`。默认 API 根地址为 `https://meragpt.com`，可通过 `baseURL` 覆盖。`decider-1` 跟随最新 1.x，也接受旧别名 `sd-1`、`state-decider-1`；要固定版本，请选择 `decider-1.1`。

支持 `noul`、`choice`、`score`，每次最多 64 道题；每题最多 255 个 `choice` 选项或 32 个 `score` 等级。state 与任一单题合计最多 32,768 tokens，图片计入该预算。请求可附带最多 8 张 PNG、JPEG 或 WebP，每张最多 8 MB（8,000,000 字节）。

API 使用预付费额度。发起探针或推理前请确认账户余额；额度不足会返回 HTTP 402。详见 [Decider 接口](https://meragpt.com/docs/decider)和 [meraGPT 真实探针](testing.md#meragpt-凭据与真实探针)。

## Liquid AI

在 `liquid` 设置页保存 API Key，凭据引用为 `LIQUID_API_KEY`。默认 `baseURL` 是 `https://api.liquid.ai/decisions`；自定义地址须包含兼容的路径前缀，插件会追加 `/v1/systemone`。选择 `d1.2` 或 `d1.2-ultra`，默认超时 10,000 ms。

两款模型均支持 `noul`、`choice` 和 `score`。单次最多 128 道题；共享 state、媒体和任一单题合计最多 65,536 tokens。可以在同一请求中附带最多 8 张 PNG/JPEG/WebP 图片与最多 8 段 WAV/MP3 音频，音频总长最多 300 秒。完整 JSON 请求体（含编码后的附件）须小于 4.5 MB（4,500,000 字节）；大附件宜先压缩。格式和后端限制见 [Liquid 接口文档](https://docs.liquid.ai/lfm/models/d1)。

两款模型都已通过真实接口的文本评分、图片分类和音频判断。见[运行探针与实测样例](testing.md#liquid-ai-真实探针)。

### 文本与图片定位

`d1.2` 和 `d1.2-ultra` 均支持[定位](locate.md)的文本与图片输入。每次定位最多返回 16 个匹配；达到上限时会提示可能还有结果。文本部分最多 250,000 个 UTF-8 字节，编码后的整份 JSON 仍须小于 4.5 MB。图片定位只接收一张图片，Liquid 还校验每张图的长宽比（最长边不超过最短边的 100 倍）以及 32 × 32 像素图块数（最多 10,000）。复用原有 Liquid 凭据、端点和超时。详见 [Liquid 定位协议](https://docs.liquid.ai/lfm/models/d1#typed-answers)。

## Cloudflare Clef

文本与图片可选 `clef` 或 `clef-flash`；需要音频或视频时选择 `clef-omni`。向 Cloudflare 托管的 Clef 或 Clef-flash 发送视频会返回 HTTP 422。

在 Cloudflare 控制台创建有 Workers AI 调用权限的 API token，并取得 Account ID。在 Cloudflare 组件中填写 Account ID 和 API Key（即该 token），点「保存设置」。Account ID 也可通过启动进程的 `CLOUDFLARE_ACCOUNT_ID` 配置。

保留默认 API 根地址即可直连 Cloudflare。插件会拼接 `/accounts/{accountId}/ai/run/@cf/cloudflare/{model}`，请求体使用短模型名。包内 adapter 同时接受 `@cf/cloudflare/clef`、`@cf/cloudflare/clef-flash` 和 `@cf/cloudflare/clef-omni`。

```ts
const result = await ctx.system1.decide({
  model: { provider: 'cloudflare', model: 'clef-flash' },
  state: '支付页面持续返回错误。',
  questions: { urgent: { type: 'noul', instructions: '是否需要立即处理？' } },
  timeoutMs: 10000,
})
```

Cloudflare 对每次请求最多接受 64 道题；每道 `choice` 最多 255 个选项，每道 `score` 最多 10 个等级。题号最长 100 个字符，可使用字母、数字、下划线、点和连字符。上下文上限按模型分别为 `clef` 65,536、`clef-flash` 24,576、`clef-omni` 64,000 tokens；长输入可能由后端截断，应在业务侧控制输入长度。统一 `images` 附件支持 PNG、JPEG 和 WebP，每张最大 4 MiB、总计最大 8 MiB，最多 4 张；provider 会转换成 Cloudflare 所需的 base64 data URL。

在 Clef 系列中，音频和视频由 `clef-omni` 处理：音频可用 `audio/wav` 或 `audio/mpeg`，最多 4 段、每段不超过 8 MiB；视频可用 `video/mp4` 或 `video/webm`，最多 2 段、每段不超过 16 MiB。音频与视频解码后合计不超过 16 MiB；音频最长 300 秒、视频最长 60 秒，时长由 Cloudflare 校验，视频按 2 fps 采样。图片的 8 MiB 预算单独计算。附件以不带前缀的 Base64 传入，provider 会添加 data URL 前缀并写入顶层 `audio`、`videos` 字段；其他模型会在发出请求前因不支持媒体而被跳过，沿用现有备用模型链。参见 [Clef 官方接口](https://developers.cloudflare.com/workers-ai/models/clef/)、[Clef-omni 官方接口](https://developers.cloudflare.com/workers-ai/models/clef-omni/)和 [Workers AI REST 入门](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)。

Cloudflare 的公开示例明确展示 `audio/mpeg` 与 `video/mp4`；本包把 WAV 与 WebM 分别映射为 `audio/wav`、`video/webm`，但尚未用账户级 schema 或真实请求验证这两个 MIME 值。首次使用 WAV 或 WebM 前，建议先以小样本验证；MP3 与 MP4 有官方请求示例可参考。

上述 Omni 能力针对 Cloudflare 托管接口。自定义 `baseURL` 必须实现相同的模型和媒体契约；仓库中的本地 Clef 测试包装目前只提供 `clef-flash`。

嵌入使用时可直接创建 provider；`fetch` 可选，用于替换传输或本地协议 fixture：

```ts
import { decideOperation } from 'dsh-system1'
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerImplementation(decideOperation, 'cloudflare', backend))
```

凭据申请和真实调用探针见[测试与真实模型验证](testing.md#cloudflare-凭据)。

## 按调用使用 OpenRouter

独立加载 `dsh-system1/providers/openrouter`，然后对这次 `decide()` 显式选用 `perplexity/pplx-decider-v1.3:free`。插件默认从 `OPENROUTER_API_KEY` 读取凭据，开启 DSH credentials 服务时解析同名凭据引用；可通过 `apiKeyEnv` 指定另一引用。使用专用 OpenRouter API key；先确认该 key 所属工作空间没有任何自配或共享的上游供应商凭据（BYOK）。

```ts
import * as openrouter from 'dsh-system1/providers/openrouter'

await ctx.plugin(openrouter, {})
const decision = await ctx.system1.decide({
  state: '顾客要求退还重复扣款。',
  questions: { refund: { type: 'noul', instructions: '顾客是否要求退款？' } },
  model: { provider: 'openrouter', model: 'perplexity/pplx-decider-v1.3:free' },
})
```

使用文本或 JSON（JSON 会序列化成文本），支持 `noul`、`choice`、`score`。请求固定发到 OpenRouter Decisions alpha 的 Perplexity 免费端点；仅接收指定版本、费用为零且 `is_byok:false` 的响应。该字段在调用后检查结果，不能阻止或撤销供应商已经产生的费用。逐题拒答或缺失概率时检查 `answers[id].status`。免费额度或端点可能调整；遇到限流或路由不可用请按错误处理。这一路由不会在 OpenRouter 内改用其他模型或供应商。显式 `model` 也不会进入你自己配置的服务兜底链。
