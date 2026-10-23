# 模型服务配置

[简体中文](providers.md) | [English](providers.en.md)

在 DSH 插件设置中选择默认服务与模型，并按顺序添加备用模型；在对应服务组件中保存连接参数、密钥和可选的 `timeoutMs`。调用方也可通过 `model: { provider, model }` 逐次选择。每次模型尝试都会获得完整超时预算（包括能力检查与 HTTP 调用），因此兜底链总时长可达到模型数乘以预算。超时优先级为：调用显式 `timeoutMs`、所选 provider 设置页中的 `timeoutMs`、provider 自身默认值。留空使用 provider 默认值。本地模型首次加载和 CPU 推理应使用更长的预算。详见 [备用模型](api.md#备用模型)。

| Provider | 模型 | 默认超时 | 默认服务地址 | 凭据引用 |
| --- | --- | ---: | --- | --- |
| `typesafe` | `jev-latest`、`jev-preview`、`jev-1.14.0`、`jev-1.13.0` | 800 ms | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`、`english`、`multilingual`、`typed-decisions` | 800 ms | `http://127.0.0.1:8000` | `LAYA_API_KEY`，可选 |
| `nace` | `drex-v2.0`、`drex-v1.5`、`drex-max` | 60,000 ms | `https://console.nace.ai` | `NACE_API_KEY` |
| `cloudflare` | `clef`、`clef-flash`、`clef-omni` | 800 ms | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

`jev-1.14.0` 和 `jev-1.13.0` 是固定版本。`jev-latest` 指向最新稳定版，`jev-preview` 指向最新发布版；别名映射会随 TypeSafe 更新。需要固定行为时选择版本 ID。详见 TypeSafe 的[模型目录](https://docs.typesafe.ai/models)。

provider 模型目录与能力由本项目显式维护，不会在运行时自动覆盖。跟进上游更新时，先核对官方 changelog、模型页或 schema 的模型 ID、输入格式与限制，再更新对应 provider 的模型目录、能力声明、传输 fixture 和中英文文档；动态别名只跟随模型名称，不代表新能力已同步。价格等上游可变信息不纳入产品契约。

密钥优先通过 DSH credentials 服务解析；宿主没有该服务时读取进程环境。密钥不会回显。在服务组件的设置页填写 API Key 后，与连接参数一起点「保存设置」写入 DSH 凭据存储；留空保存会保留已有密钥。设置页仅在当前值与包默认值不同时显示「已覆盖」，「恢复默认值」会写回包默认值。各独立 provider 插件可用 `id` 和 `apiKeyEnv` 自定义注册名及凭据引用。

## 本地部署范围

启动、复测与验证边界见[测试与真实模型验证](testing.md)。

Laya 提供[官方本地 HTTP 服务](https://github.com/NandhaKishorM/laya)，可直接接入本插件的 `/v1/systemone` 传输。Cloudflare 发布了 [Clef-flash 权重和决策推理代码](https://huggingface.co/Cloudflare/clef-flash)；本地运行需要同时加载 backbone 和 joint schema head，普通聊天模型服务不能替代该决策接口。仓库提供的本地包装复刻 Workers AI REST 路径，同一个 `cloudflare` provider 将 `baseURL` 指向本地即可使用；本地 Clef 推理与 Cloudflare Workers AI 云端接口需要分别验证。

TypeSafe 的[公开部署说明](https://docs.typesafe.ai/introduction/quickstart)目前提供托管 API；[模型文档](https://docs.typesafe.ai/models)未提供可据此部署的 Jev 本地发行版。本项目通过真实托管调用验证 TypeSafe，不将本地协议模拟计作 Jev 本地推理。

### Jev 图片、Box 与长上下文

公共请求结构设有资源安全上限：每种附件最多 16 项，单项最多 16 MiB，所有附件解码后合计最多 64 MiB；模型能力可以更严格。Jev 最多支持 4 张 PNG/JPEG 图片，每张最多 16 MiB、总计最多 16 MiB；图片会被编码为 TypeSafe `assets` 并自动发送 `TypeSafe-Danger-Zone-Images` 请求头。TypeSafe 将图片和 Box 标为实验能力，格式、限制和准确性可能随版本变化。Jev 1.14（或当前映射到 1.14 的 `jev-preview`）支持 `box`，结果中的四条边是 0–1 之间的归一化坐标。通过 `longContext: true` 可显式请求 262k tokens；默认仍按每请求 64k、每题 32k 的常规上限执行。详见[TypeSafe 图片说明](https://docs.typesafe.ai/images)、[Box 说明](https://docs.typesafe.ai/primitives/box)和[上下文限制](https://docs.typesafe.ai/models#long-context)。

## Nace.AI Drex

在 DSH 的 `nace` provider 设置页保存 API Key；密钥写入 DSH credentials，引用名为 `NACE_API_KEY`。没有 DSH credentials 服务时会读取进程环境中的 `NACE_API_KEY`。默认 API 根地址 `https://console.nace.ai` 通常无需修改；兼容服务可通过 `baseURL` 覆盖。Nace provider 的模型选择首选 `drex-v2.0`，但不改变服务全局默认的 TypeSafe `jev-latest`。创建或轮换 key 见 Nace 的[身份验证说明](https://console.nace.ai/docs/drex/guides/authentication)。

| 模型 | 每次请求题数 | state 上限 | state + 最长单题 | 图片 |
| --- | ---: | ---: | ---: | --- |
| `drex-v1.5` | 512 | 131,072 tokens | 139,264 tokens | 不支持 |
| `drex-v2.0` | 512 | 131,072 tokens | 262,144 tokens | 不支持 |
| `drex-max` | 16 | 131,072 tokens | 262,144 tokens | 最多 8 张 |

版本号模型 ID 固定，便于复现；provider 不把会移动的 `drex-latest` 放入模型目录。Nace 不支持 `box`。服务会公开 token 限制供能力查询，但没有 Drex tokenizer，因此实际 token 上限由 Nace 校验。

Drex 可能把 `choice` 或 `score` 分布中的每项概率舍入到四位小数，因此总和可能略高于或低于 1。DSH 仅在偏差不超过逐项舍入的最大误差时重新归一化；更大的偏差仍按常规答案校验规则处理。

只有 `drex-max` 支持 PNG、JPEG、WebP 图片，最多 8 张、每张 16 MiB、合计 32 MiB，单图分辨率上限 40 megapixels；每道 `choice` 最多 255 个选项，每道 `score` 最多 255 个等级。Max 的 state 与最长单题合计上限为 262,144 tokens；超过 131,072 tokens 的题目合计不超过 1,048,576 tokens，且图像 tokens 计入这些上限。Nace 将序列化后的 UTF-8 JSON 请求体限制为 4 MiB，计入 `state`、`questions` 和非空 `images`，但不计顶层 `model`。小图以内联方式发送；内联图像会超出请求体上限时，adapter 只上传足够数量的图片并传递账号级文件引用，不使用 workspace。推理结束后 adapter 会尝试删除上传文件；清理失败时，Nace 默认在 24 小时后清除账号级上传，已删除文件的备份最多还需 35 天清除。对不允许临时上传到第三方服务的图片，不要使用该路径。详见 Nace 的[模型目录](https://console.nace.ai/docs/drex/reference/models)、[请求限制](https://console.nace.ai/docs/drex/reference/limits)、[Drex Max 图片说明](https://console.nace.ai/docs/drex/guides/drex-max)和[数据留存政策](https://console.nace.ai/docs/perception/data-retention)。

单次调用可指定 Nace，不改变服务默认模型：

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-v2.0' },
  state: '客户称退款已等待两周，并请求帮助。',
  questions: {
    refund: { type: 'noul', instructions: '客户是否在询问退款？' },
  },
})
```

图片输入必须选择 `drex-max`，并使用请求共享的 `images` 字段：

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-max' },
  state: '请检查图片 1。',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  questions: {
    damaged: { type: 'noul', instructions: '图片 1 中的物品是否损坏？' },
  },
})
```

发送真实请求前，先查看[测试与真实模型验证](testing.md#nace-凭据与真实探针)。

## Cloudflare Clef

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

Cloudflare 对每次请求最多接受 64 道题，题号最长 100 个字符，可使用字母、数字、下划线、点和连字符。上下文上限按模型分别为 `clef` 65,536、`clef-flash` 24,576、`clef-omni` 64,000 tokens；长输入可能由后端截断，应在业务侧控制输入长度。统一 `images` 附件支持 PNG、JPEG 和 WebP，每张最大 4 MiB、总计最大 8 MiB，最多 4 张；provider 会转换成 Cloudflare 所需的 base64 data URL。

只有 `clef-omni` 接受音频和视频：音频可用 `audio/wav` 或 `audio/mpeg`，最多 4 段、每段不超过 8 MiB；视频可用 `video/mp4` 或 `video/webm`，最多 2 段、每段不超过 16 MiB。音频与视频解码后合计不超过 16 MiB；音频最长 300 秒、视频最长 60 秒，时长由 Cloudflare 校验，视频按 2 fps 采样。图片的 8 MiB 预算单独计算。附件以不带前缀的 Base64 传入，provider 会添加 data URL 前缀并写入顶层 `audio`、`videos` 字段；其他模型会在发出请求前因不支持媒体而被跳过，沿用现有备用模型链。参见 [Clef 官方接口](https://developers.cloudflare.com/workers-ai/models/clef/)、[Clef-omni 官方接口](https://developers.cloudflare.com/workers-ai/models/clef-omni/)和 [Workers AI REST 入门](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)。

Cloudflare 的公开示例明确展示 `audio/mpeg` 与 `video/mp4`；本包把 WAV 与 WebM 分别映射为 `audio/wav`、`video/webm`，但尚未用账户级 schema 或真实请求验证这两个 MIME 值。首次使用 WAV 或 WebM 前，建议先以小样本验证；MP3 与 MP4 有官方请求示例可参考。

上述 Omni 能力针对 Cloudflare 托管接口。自定义 `baseURL` 必须实现相同的模型和媒体契约；仓库中的本地 Clef 测试包装目前只提供 `clef-flash`。

嵌入使用时可直接创建 provider；`fetch` 可选，用于替换传输或本地协议 fixture：

```ts
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerProvider('cloudflare', backend))
```

凭据申请和真实调用探针见[测试与真实模型验证](testing.md#cloudflare-凭据)。
