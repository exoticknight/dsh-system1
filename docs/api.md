# API 与 provider 开发

[简体中文](api.md) | [English](api.en.md)

## 请求与结果

`decide({ state, questions, model?, signal?, timeoutMs? })` 接受具名问题集合。`model` 为 `{ provider, model }`；省略时按顺序尝试服务的 `defaultModel` 和 `fallbackModels`。没有可用模型时会抛出 `System1InputError`。`timeoutMs` 为正整数毫秒，默认 800；每次模型尝试都会获得完整预算，覆盖能力查询和后端调用。

公开入口：根入口导出服务、错误类和类型；`dsh-system1/contracts` 只导出类型。`dsh-system1/providers/typesafe`、`dsh-system1/providers/laya` 和 `dsh-system1/providers/cloudflare` 分别导出 provider 插件及 `createTypesafeProvider`、`createLayaProvider`、`createCloudflareProvider` 工厂。连接参数与模型选择见[模型服务配置](providers.md)。

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

`noul` 返回 `probabilityTrue`；`choice` 返回候选键与完整 `probabilities`；`score` 返回从 0 开始的期望等级，以及按 `criteria` 顺序排列的分布。概率是模型输出，消费插件自行确定动作阈值。

TypeSafe 的 confidence 原样保留，可通过 `meta.executed` 确认 provider 和实际模型。TypeSafe 根据分布计算 0–1 的确定性统计量作为 confidence，但协议没有固定其公式，详见 [TypeSafe Confidence](https://docs.typesafe.ai/confidence)。其他 provider 必须先说明 confidence 的语义，消费插件才能判断是否能复用其他 provider 的阈值。

公开输入支持 JSON。当前 TypeSafe state 支持字符串、对象和数组；其他 JSON 标量返回 `unsupported`。问题 instructions 和 criteria 描述支持字符串、对象或数组；choice 描述也可以为 `null`。问题和选项标识不得为空，也不能为 `__proto__`、`prototype` 或 `constructor`。

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
- `questions`：问题数组。每项包含 `id`（结果键，不可重复）、`type`（`noul`、`choice` 或 `score`）、字符串 `instructions`，以及与 `decide()` 相同的可选 `criteria`。`choice` 需要候选键到描述的对象，`score` 需要从低到高的等级数组。
- `model`：可选的 `{ provider, model }`，省略时使用服务默认模型。

返回 `{ answers, model?, fallbacks? }`。`answers` 按 `id` 给出 `{ status: 'ok', answer }` 或 `{ status: 'error', error: { code, message } }`。有 provider 成功时，`model` 是实际执行的 provider 和模型；没有 provider 成功时省略。发生非取消的失败尝试时，`fallbacks` 按顺序列出 `{ provider, model, error: { code, message } }`。工具把调用取消信号传给 `decide()`，超时沿用服务配置。结构错误使整次工具调用失败，单题运行故障只体现在该题结果中。

工具描述的数值含义是：概率在 0–1；`score.value` 是从 0 开始、对应 criteria 位置的期望等级下标；`confidence` 由后端定义，不能当作概率或跨后端比较。不同模型返回的概率也未相互校准。

## 实现 provider

从 `dsh-system1/contracts` 导入类型，从包根入口导入 `System1ProviderError`。错误消息必须安全可展示。实现 `describe(model, signal)` 和 `evaluate(request, signal)`，并返回标准逐题答案。请求参数按只读处理。参见[provider 示例](../examples/provider.ts)。

```ts
ctx.effect(() => ctx.system1.registerProvider('custom', backend))
```

同一个服务中的 provider id 必须唯一。注册返回幂等 disposer。注销会取消该实例的在途调用，服务释放时会清理全部注册。按模型声明已知能力限制，未知限制省略。context token 数仅供参考；实际 token 预算由后端执行。

## TypeSafe 能力与限制

支持模型 `jev-1.13.0`、`jev-latest` 和 `jev-preview`。`choice` 最多支持 255 个候选；`score` 支持 2–10 个等级。固定模型报告的 context 信息包括每个请求总计 64k tokens，以及 state 加最长单题共 32k tokens。精确 token 限制由后端执行。HTTP 422 保留为 `provider_error` 并附带 `httpStatus`；没有稳定错误码时，不推断它代表长度超限。

provider 插件接受 `id`、`apiKeyEnv` 和可选的 `baseURL`；前两者默认值为 `typesafe` 和 `TYPESAFE_API_KEY`。`createTypesafeProvider` 接受显式 api key、可选 base URL 和 fetch 实现，便于嵌入调用与本地 fixture。
