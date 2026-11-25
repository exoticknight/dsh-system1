# 定位文本或图片中的证据

[简体中文](locate.md) | [English](locate.en.md)

要高亮合同里的付款条款，或框出一张照片里所有符合条件的对象，可以调用定位。每次传一条指令和一份原始材料，拿到可以直接用于高亮或叠框的位置。

## 配置定位路由

在 **System One** 插件设置的**操作**区选择**定位**标签页。打开**启用定位**，选择主模型，按顺序添加备用模型。分别查看文本和图片的路由预览，再点**保存设置**。要配置密钥、端点或超时，从 DSH 的**组件**列表打开服务商子插件。

| Provider 与模型 | 输入 |
| --- | --- |
| Nace `drex-max-locate` | 文本 |
| Nace `drex-max-box` | 图片 |
| Liquid AI `d1.2`、`d1.2-ultra` | 文本和图片 |

例如，主模型选 Nace `drex-max-locate`，备用模型选 Liquid `d1.2`。文本先尝试 Nace，图片直接交给 Liquid。调用前先[配置 provider 连接](providers.md)。兜底可能把同一份材料发送给另一家服务，只配置获准接收该材料的 provider。

未配置的定位操作默认关闭。关闭**启用定位**并保存后，插件和 Agent 都不能发起新的定位请求；正在运行的请求继续执行。已保存的路由和工具开关偏好仍可编辑，重新启用后可直接复用。插件可以显式指定模型，不必先保存路由，但仍须启用定位。

**Agent 工具**开关只管是否向 Agent 提供 `system1_locate`。要发布工具，保持随包的 `system1-tool` 组件启用，选好有效主模型，再打开 Agent 工具开关。仅关闭这个开关时，插件仍可调用定位。

在无界面运行的配置中，服务的等效设置是：

```yaml
operations:
  locate:
    version: 1
    enabled: true
    defaultModel: { provider: nace, model: drex-max-locate }
    fallbackModels:
      - { provider: liquid, model: d1.2 }
    agentEnabled: true
```

在无界面配置中，设置 `operations.locate.enabled: false` 可暂停定位，其余字段可以保留。决策有独立开关 `operations.decide.enabled`，模型路由仍存放在服务顶层的 `defaultModel` 和 `fallbackModels`。

## 高亮原文

```ts
import { toUtf16Range } from 'dsh-system1'

const source = '（到期日😀）六月二十日；服务截止日：六月二十日。'
const result = await ctx.system1.locate({
  source: { type: 'text', text: source },
  instructions: '找出两处日期，重复出现也要标出。',
})
if (result.status === 'ok') {
  for (const { start, end } of result.matches) {
    const range = toUtf16Range(source, start, end)
    console.log(range, source.slice(...range))
  }
}
```

文本匹配含 `text`、`start`、`end`。公开索引以从 0 开始的 Unicode 码点计，左闭右开。例如，`甲😀乙` 中的 `乙` 是 `[2, 3)`，换算成 JavaScript UTF-16 范围则是 `[3, 4)`。传入原文时保留空白等字符；结果中的文字必须和原文对应范围完全一致。

## 在单张图片上叠框

把来源换成 `source: { type: 'image', image: { mediaType, data } }`。支持 PNG、JPEG 或 WebP，使用带标准补位、无 data URL 前缀的 Base64。每个匹配含 `left`、`top`、`right`、`bottom`，相对图片左上角取 0 到 1。横向边缘乘以显示宽度，纵向边缘乘以显示高度。如果界面有内边距或留黑，叠框要对齐实际图片区域。

两种输入的完整写法参见[定位消费插件示例](../examples/locate.ts)。`decide()` 的 `box` 题型仍可在一组决策问题里返回一个框；需要零至多个匹配时用定位。

## 处理空结果、截断和失败

- `status: 'ok'` 带有 `matches` 和标识实际服务商及模型的 `meta.executed`。合法空数组会结束路由；上游没返回匹配列表则是错误。
- `matchScore` 是 Nace 的匹配分；`presenceProbability` 是 Liquid 估计的存在概率；`locationConfidence` 是 Liquid 对框位置的置信度。数值均在 0–1，缺失表示未知。使用针对当前模型和材料验证过的阈值。
- `mayHaveMore: true` 表示上游提示达到结果数量上限；`false` 表示上游未报告截断；字段缺失表示未知。脱敏等必须找全的场景要独立核查材料。
- `status: 'error'` 带 `error`、`reason` 和 `meta.attempts`，不带 `matches`。原因分为无适用模型（`no_applicable_model`）、上游执行失败（`upstream_execution_failed`）和取消（`cancelled`）；尝试摘要区分跳过与执行，便于修正路由或决定是否重试。输入结构不合法时抛出 `System1InputError`；定位关闭时调用会抛出 `System1OperationDisabledError`。

`locate(input, { model, signal, timeoutMs })` 的第二个参数可省略。显式指定 `model` 时只尝试该模型。每个候选独立计时，依次取调用覆盖值、provider 配置值、provider 默认值。路由跳过不适用的候选；允许兜底的故障可以继续尝试。取消会结束整条链。收到 Nace 的 `403` 状态也会立即结束路由：原因可能是 Zero retention，或缺少推理权限。Agent 工具接收相同的 `source` 和 `instructions`，走已保存的定位路由。
