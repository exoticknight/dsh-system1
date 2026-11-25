# API 与 provider 开发

[简体中文](api.md) | [English](api.en.md)

## 请求与结果

`decide({ state, questions, images?, audio?, videos?, longContext?, model?, signal?, timeoutMs? })` 接受具名问题集合。`model` 为 `{ provider, model }`；省略时按顺序尝试服务的 `defaultModel` 和 `fallbackModels`。没有可用模型时会抛出 `System1InputError`。`timeoutMs` 为正整数毫秒，优先级为：调用显式值、所选 provider 的 `timeoutMs` 配置、provider 自身默认值。TypeSafe、Laya 和 Cloudflare 默认 800 ms，meraGPT 和 Liquid AI 默认 10,000 ms，Nace 默认 60,000 ms。每次模型尝试都会获得完整预算，覆盖能力查询和后端调用。

0.4.0 迁移：服务级 `timeoutMs` 已移除，旧配置中残留的服务级值会被忽略；请将自定义超时移到对应 provider 设置页。第三方 `System1Provider` 需实现 `timeoutMs(): number`，以替代 `defaultTimeoutMs`；`ModelCapabilities` 现在要求显式声明题目限制和所支持附件的数量、字节上限。

根入口导出服务、错误类和类型；`dsh-system1/contracts` 导出公开类型（含 `ProviderModel`）；`dsh-system1/providers` 导出 `findProviderModel`。内置 provider 的子路径 `dsh-system1/providers/<id>` 导出 Cordis 插件、`create…Provider` 工厂和模型目录；`<id>` 可用 `typesafe`、`laya`、`nace`、`meragpt`、`liquid` 或 `cloudflare`。连接参数与模型选择见[模型服务配置](providers.md)。

消费插件声明 `inject: ['system1']`。参见[消费插件示例](../examples/consumer.ts)。

```ts
const result = await ctx.system1.decide({
  state: '用户询问退款进度。',
  questions: {
    refund: { type: 'noul', instructions: '用户是否在询问退款？' },
    topic: {
      type: 'choice',
      instructions: '选择主题。',
      criteria: { billing: '账单退款', technical: '技术支持' },
    },
    urgency: {
      type: 'score',
      instructions: '判断紧急程度。',
      criteria: ['一般', '紧急', '非常紧急'],
    },
  },
})
if (result.answers.topic.status === 'ok') {
  const topic = result.answers.topic.answer.value
}
```

`noul` 返回 `probabilityTrue`；`choice` 返回候选键与完整 `probabilities`；`score` 返回从 0 开始的期望等级，以及按 `criteria` 顺序排列的分布。`box` 问题返回 `{ type: 'box', box: { top, bottom, left, right }, confidence? }`，边缘是 0 到 1 之间的图片比例。概率和坐标都是模型输出，消费插件自行确定动作阈值。

`images`、`audio` 和 `videos` 对整份请求共享。每项为 `{ mediaType, data }`，其中 `data` 是带标准补位、不含 data URL 前缀的 Base64。通用层限制每类最多 16 项、单项最多 16 MiB、所有附件解码后合计最多 64 MiB。Provider 可以设置更严格的限制：

- **图片**：PNG、JPEG 或 WebP。Nace 的两款 Max、meraGPT 和 Liquid 各最多 8 张；TypeSafe 和 Cloudflare 各最多 4 张，TypeSafe 只接受 PNG、JPEG。`box` 需要至少一张图片，并且所选模型必须支持该题型。
- **音频**：WAV（`audio/wav`）或 MP3（`audio/mpeg`），可选 [Liquid AI](providers.md#liquid-ai) 或 [Cloudflare `clef-omni`](providers.md#cloudflare-clef)。
- **视频**：MP4（`video/mp4`）或 WebM（`video/webm`），内置模型中由 `clef-omni` 处理。Cloudflare 的音频和视频共享解码后 16 MiB 预算，图片预算独立。

Provider 会按模型预检附件格式、数量和字节数。兜底链会跳过不支持所需附件的模型。对 TypeSafe Jev 设置 `longContext: true` 可申请 262k-token 扩展上下文。

Cloudflare 的公开示例明确使用 MP3=`audio/mpeg` 和 MP4=`video/mp4`；本包将 WAV、WebM 分别映射为 `audio/wav`、`video/webm`，但这两个 MIME 值尚未通过账户级 schema 或真实请求验证。首次使用 WAV 或 WebM 前，请先用小样本验证。

```ts
const result = await ctx.system1.decide({
  state: '检查这台设备的安装和运行状态。',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  audio: [{ mediaType: 'audio/mpeg', data: audioBase64 }],
  videos: [{ mediaType: 'video/mp4', data: videoBase64 }],
  questions: {
    label_visible: { type: 'noul', instructions: '铭牌在图片中是否清晰可见？' },
    runs_smoothly: { type: 'noul', instructions: '设备运行时是否平稳，没有异响？' },
  },
  model: { provider: 'cloudflare', model: 'clef-omni' },
})
```

TypeSafe 的 confidence 原样保留，可通过 `meta.executed` 确认 provider 和实际模型。TypeSafe 根据分布计算 0–1 的确定性统计量作为 confidence，但协议没有固定其公式，详见 [TypeSafe Confidence](https://docs.typesafe.ai/confidence)。其他 provider 必须先说明 confidence 的语义，消费插件才能判断是否能复用其他 provider 的阈值。

`state` 支持 JSON。当前 TypeSafe state 支持字符串、对象和数组；其他 JSON 标量返回 `unsupported`。问题 instructions 和 criteria 描述支持字符串、对象或数组；choice 描述也可以为 `null`。媒体通过顶层 `images`、`audio`、`videos` 字段传入。问题和选项标识不得为空，也不能为 `__proto__`、`prototype` 或 `constructor`。

无效调用结构抛出 `System1InputError`。结构合法的请求发生运行故障时，通过逐题 `status: 'error'` 返回。错误代码包括 `unavailable`、`unsupported`、`limit_exceeded`、`timeout`、`cancelled`、`provider_error` 和 `invalid_response`。某题缺失或答案无效不会影响其他合法答案；额外题号会记入 `meta.warnings`。

`meta.requested` 表示所选 provider id 和模型。仅在收到有效后端响应后才提供 `meta.executed`。元数据还包括 request id、耗时和可用用量。`approximate`、`degraded` 由 provider 提供；字段缺失表示未知。调用方可以逐次覆盖 `signal` 和 `timeoutMs`。每次尝试使用完整超时预算，因此兜底链的最坏总时长为链中模型数乘以预算。超时无法终止不合作的第三方代码，因此 provider 应取消底层 I/O。

## 备用模型

在插件设置中按顺序添加备用模型。服务会依次尝试 `[defaultModel, ...fallbackModels]`，完全相同的 provider 与模型组合只执行一次。调用方显式传入 `model` 时只执行该模型，不读取备用链。每个备用项须包含字符串 `provider` 和 `model`；格式错误的插件配置会在加载时被拒绝，使用备用链时还会校验非空值。显式 `model` 的调用不受未使用的备用项影响。

整次模型尝试失败时，服务继续尝试下一项。未注册 provider、超时、能力不支持、`provider_error` 或无效响应信封会触发兜底。有效信封中的单题答案无效时，服务按题返回错误，不会重试其他模型。调用方取消、provider 报告 `cancelled`、provider 在调用中注销或服务卸载都会结束整条链；取消的那次尝试不计入 `meta.attempts`。

`meta.requested` 是链首模型，`meta.executed` 是成功执行的 provider 和实际模型，`meta.attempts` 按顺序列出已完成但失败的尝试及错误码和消息；没有记录项时省略。全部模型尝试失败时，每题返回最后一次尝试的错误；如果执行被取消，则返回 `cancelled`。不同模型的概率未相互校准；需要稳定阈值的消费插件应检查 `meta.executed`。

## Agent 工具

`dsh-system1/tool` 组件注入 `system1` 和 DSH `tools`，注册模型可调用的 `system1_decide` 工具。组件只依赖宿主已有的工具注册表，不引入 `@deepseek-ai/dsh-tools` 运行时依赖。

参数：

- `state`：要判断的文本或 JSON 值。
- `questions`：问题数组。每项包含 `id`（结果键，不可重复）、`type`（`noul`、`choice`、`score` 或 `box`）、字符串 `instructions`，以及与 `decide()` 相同的可选 `criteria`。`choice` 需要候选键到描述的对象，`score` 需要从低到高的等级数组，`box` 需要图片附件。
- `images`：可选图片附件列表，格式与 `decide()` 的 `images` 相同。
- `audio`、`videos`：可选音频和视频附件列表，格式与 `decide()` 相同；Liquid AI 和 Cloudflare `clef-omni` 接受音频；视频请选择 `clef-omni`。
- `longContext`：可选布尔值；为 `true` 时请求 TypeSafe Jev 使用扩展上下文。
- `model`：可选的 `{ provider, model }`，省略时使用服务默认模型。

返回 `{ answers, model?, fallbacks? }`。`answers` 按 `id` 给出 `{ status: 'ok', answer }` 或 `{ status: 'error', error: { code, message } }`。有 provider 成功时，`model` 是实际执行的 provider 和模型；没有 provider 成功时省略。发生非取消的失败尝试时，`fallbacks` 按顺序列出 `{ provider, model, error: { code, message } }`。工具把调用取消信号传给 `decide()`，超时采用所选 provider 的配置或默认值。结构错误使整次工具调用失败，单题运行故障只体现在该题结果中。

工具描述的数值含义是：概率在 0–1；`score.value` 是从 0 开始、对应 criteria 位置的期望等级下标；`box` 的 `top`、`bottom`、`left`、`right` 是 0–1 图片比例；`confidence` 由后端定义，不能当作概率或跨后端比较。不同模型返回的概率也未相互校准。

## 实现 provider

每个 provider 在自己的模型数组中声明规范 ID 和可选别名，不需要维护跨 provider 的总目录。`ProviderModel` 使用 `id` 表示规范模型 ID，`aliases` 表示该 provider 也接受的输入名称；设置页使用数组中的规范 ID，别名不会成为单独的菜单项。`findProviderModel(models, input)` 可按规范 ID 或别名查找模型定义，匹配成功后的 `id` 用于能力查询和上游请求。内置 provider 会先检查模型 ID，未知模型返回 `unsupported`，然后再解析凭据。能力限制由 provider adapter 声明；设置页的本地化显示文案由 client locale 维护。

从 `dsh-system1/contracts` 导入类型，从包根入口导入 `System1ProviderError`；别名解析可从 `dsh-system1/providers` 导入 `findProviderModel`。错误消息必须安全可展示。实现 `describe(model, signal)` 和 `evaluate(request, signal)`，并返回标准逐题答案。请求参数按只读处理。参见[provider 示例](../examples/provider.ts)。

```ts
import { findProviderModel } from 'dsh-system1/providers'
import type { ProviderModel } from 'dsh-system1/contracts'

const MODELS = [
  { id: 'example-v2', aliases: ['example-latest'] },
] as const satisfies readonly ProviderModel[]

const selected = findProviderModel(MODELS, requestedModel)
// selected?.id 是供能力查询和上游请求使用的规范 ID
```

```ts
ctx.effect(() => ctx.system1.registerProvider('custom', backend))
```

同一个服务中的 provider id 必须唯一。注册返回幂等 disposer。注销会取消该实例的在途调用，服务释放时会清理全部注册。`System1Provider` 必须提供 `timeoutMs(): number`；每次调用时，服务先采用请求显式值，否则调用该 provider 的方法，并以 `invalid_response` 拒绝非正整数。附件和问题数量限制全部属于 provider 声明：`maxQuestions`、`maxChoiceOptions`、`maxScoreLevels` 必须填写正整数或显式 `null`（表示由上游执行，不预检）。有图片能力时必须声明 `maxCount`、`maxBytesPerImage`、`maxTotalBytes`；有音频或视频能力时，必须声明 `maxCount`、`maxBytesPerItem`。附件声明不得高于通用资源安全上限：每类 16 项、单项 16 MiB、合计 64 MiB。漏写或运行时返回不完整能力会以 `invalid_response` 结束尝试，并由 provider logger 记录一次警告。扩展上下文通过 `longContext.maxTokens` 声明；context token 数仅供参考，实际 token 预算由后端执行。`ProviderRequest` 会收到公共媒体附件与 `longContext` 选项。

## TypeSafe 能力与限制

支持模型 `jev-1.13.0`、`jev-1.14.0`、`jev-latest` 和 `jev-preview`。两个版本 ID 固定指向对应版本；`jev-latest` 和 `jev-preview` 是由 TypeSafe 更新映射的动态别名。`choice` 最多支持 255 个候选；`score` 支持 2–10 个等级。Jev 1.13 和 1.14 的默认 context 上限均为每请求 64k tokens，以及 state 加最长单题 32k tokens；`longContext: true` 会启用 262k 上限。图片支持 PNG/JPEG；Jev 1.14 和当前指向 1.14 的 `jev-preview` 还支持 `box`。插件会按请求自动发送 TypeSafe 实验性请求头；TypeSafe 将图片和 Box 标为实验能力，协议、限制和准确性可能变化。精确 token 限制由后端执行。HTTP 422 保留为 `provider_error` 并附带 `httpStatus`；没有稳定错误码时，不推断它代表长度超限。

provider 插件接受 `id`、`apiKeyEnv` 和可选的 `baseURL`；前两者默认值为 `typesafe` 和 `TYPESAFE_API_KEY`。`createTypesafeProvider` 接受显式 api key、可选 base URL 和 fetch 实现，便于嵌入调用与本地 fixture。

## Nace.AI Drex 能力与限制

`dsh-system1/providers/nace` 导出 Cordis 插件、`createNaceProvider`、`NaceOptions` 和 `NACE_MODELS`（`drex-v2.0`、`drex-max-v1.1`、`drex-max-finance`）。Nace 支持 `noul`、`choice`、`score`。适配器将结构化描述序列化为紧凑 JSON 文本，保留 `choice` 描述中的 `null`，并按原顺序返回评分等级的概率。

三款模型每次最多接受 512 道题。图片请求使用 Max v1.1 或 Finance；两者每题最多 255 个选项或等级，整份请求最多 262,144 tokens。插件在 4 MiB JSON 请求预算内优先内联图片，超过时只上传足够数量的图片以缩小请求体。[Nace 模型服务配置](providers.md#naceai-drex)列出各模型的上下文、图片和留存限制。调用已退役的 ID 会在发出 HTTP 请求前返回 `unsupported`。Nace 返回的 token 或其他请求限制错误映射为 `provider_error`。

## meraGPT Decider 1.1 能力与限制

`dsh-system1/providers/meragpt` 导出 Cordis 插件、`createMeraGptProvider`、`MeraGptOptions` 和 `MERAGPT_MODELS`。`sd-1` 和 `state-decider-1` 会解析为 `decider-1`；显式指定 `decider-1.1` 时使用固定 ID。

每次最多 64 道 `noul`、`choice` 或 `score` 问题；选项和等级上限分别为 255 和 32。state 加任一单题最多 32,768 tokens。图片通过公共 `images` 字段传入；适配器将其转换成 state 内的 `image_url` 项，原 state 作为独立字段保留。见 [meraGPT 模型服务配置](providers.md#meragpt-decider-11)。

## Liquid AI 能力与限制

`dsh-system1/providers/liquid` 导出 Cordis 插件、`createLiquidProvider`、`LiquidOptions` 和 `LIQUID_MODELS`（`d1.2`、`d1.2-ultra`）。两款模型在本插件中支持 `noul`、`choice`、`score`，每次最多 128 道题。state、共享媒体与任一单题合计最多 65,536 tokens。候选数量和评分等级由后端校验。

用公共 `images` 和 `audio` 字段附加媒体。适配器在请求体达到 4.5 MB（含编码后的附件）时返回 `limit_exceeded`。连接参数与媒体限制见 [Liquid AI 模型服务配置](providers.md#liquid-ai)；两款模型的结果见[真实文本、图片和音频验证](testing.md#liquid-ai-真实探针)。

例如，分别对同一工单的照片和录音做判断：

```ts
const result = await ctx.system1.decide({
  model: { provider: 'liquid', model: 'd1.2' },
  state: '客户报告收到的包裹有破损。',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  audio: [{ mediaType: 'audio/wav', data: clipBase64 }],
  questions: {
    damage: { type: 'noul', instructions: '照片中的包裹有可见破损吗？' },
    refund: { type: 'noul', instructions: '录音里的客户要求退款吗？' },
  },
})
```

## Cloudflare Clef 能力与限制

三款 Clef 模型均支持 `noul`、`choice` 和 `score`，每次最多 64 道题，每题最多 255 个选项或 10 个等级。需要音频或视频时选择 `clef-omni`。见 [Cloudflare 模型服务配置](providers.md#cloudflare-clef)。
