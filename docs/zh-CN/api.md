# API 与 provider 开发

[English](../en/api.md) | [简体中文](api.md)

## 请求与结果

`decide({ state, questions, model?, signal?, timeoutMs? })` 接受具名问题集合。`model` 为 `{ provider, model }`；省略时使用服务的 `defaultModel`。两者都没有时会抛出 `System1InputError`。`timeoutMs` 为正整数毫秒，默认 800，超时预算覆盖能力查询和后端调用。

公开入口：根入口导出服务、错误类和类型；`dsh-system1/contracts` 只导出类型；`dsh-system1/providers/typesafe` 导出 provider 插件和 `createTypesafeProvider`。

消费插件声明 `inject: ['system1']`。参见[消费插件示例](../../examples/consumer.ts)。

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

`meta.requested` 表示所选 provider id 和模型。仅在收到有效后端响应后才提供 `meta.executed`。元数据还包括 request id、耗时和可用用量。`approximate`、`degraded` 由 provider 提供；字段缺失表示未知。调用方可以逐次覆盖 `signal` 和 `timeoutMs`。总预算覆盖能力查询与后端执行。超时无法终止不合作的第三方代码，因此 provider 应取消底层 I/O。

## 实现 provider

从 `dsh-system1/contracts` 导入类型，从包根入口导入 `System1ProviderError`。错误消息必须安全可展示。实现 `describe(model, signal)` 和 `evaluate(request, signal)`，并返回标准逐题答案。请求参数按只读处理。参见[provider 示例](../../examples/provider.ts)。

```ts
ctx.effect(() => ctx.system1.registerProvider('custom', backend))
```

同一个服务中的 provider id 必须唯一。注册返回幂等 disposer。注销会取消该实例的在途调用，服务释放时会清理全部注册。按模型声明已知能力限制，未知限制省略。context token 数仅供参考；实际 token 预算由后端执行。

## TypeSafe 能力与限制

支持模型 `jev-1.13.0` 和 `jev-latest`。`choice` 最多支持 255 个候选；`score` 支持 2–10 个等级。固定模型报告的 context 信息包括每个请求总计 64k tokens，以及 state 加最长单题共 32k tokens。精确 token 限制由后端执行。HTTP 422 保留为 `provider_error` 并附带 `httpStatus`；没有稳定错误码时，不推断它代表长度超限。

provider 插件接受 `id`、`apiKeyEnv` 和可选的 `baseURL`；前两者默认值为 `typesafe` 和 `TYPESAFE_API_KEY`。`createTypesafeProvider` 接受显式 api key、可选 base URL 和 fetch 实现，便于嵌入调用与本地 fixture。
