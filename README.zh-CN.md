# dsh-system1

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml)
[![使用 RED 维护](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

**为 DeepSeek Harness 插件提供类型安全的 System One 判断服务。** 消费插件调用 `ctx.system1.decide()`，解释返回结果并自行决定后续动作。

| 原语     | 返回结果                            |
| -------- | ----------------------------------- |
| `noul`   | 命题为真的概率（`probabilityTrue`） |
| `choice` | 候选键和完整概率分布                |
| `score`  | 从 0 开始的期望等级和概率分布       |

服务提供请求与响应校验、逐题结果、取消、超时、provider 注册和执行元数据。内置 TypeSafe/Jev provider 使用 TanStack 的 TypeSafe adapter。其他后端可实现公开的 provider 契约。

## 从 GitHub 安装

要求 Node.js 22.19+（22.x）或 Node.js 24、Cordis `@deepseek-ai/cordis` 4.x，以及 dsh `0.1.5-rc.2` 或兼容版本。

将公开 GitHub 仓库添加到 dsh profile：

```sh
dsh plugin --profile headless add github:exoticknight/dsh-system1
```

仓库已包含插件所需的编译文件 `lib/`，安装时无需本地克隆，也无需手动拼接压缩包路径。pnpm 支持直接从 GitHub 仓库安装依赖，详见[pnpm 支持的包来源](https://pnpm.io/package-sources)。

随包提供的 patch 会挂载服务和 TypeSafe provider。默认模型为 `jev-1.13.0`、provider id 为 `typesafe`、总超时为 800 ms。启动 dsh 前，在进程环境中设置 `TYPESAFE_API_KEY`。可根据后端延迟调整 `timeoutMs`。

## 消费插件调用

声明 `inject: ['system1']`，并导入本包提供的 Cordis 类型扩展：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from 'dsh-system1'

export const inject = ['system1']

export async function apply(ctx: Context) {
  const result = await ctx.system1.decide({
    state: '用户询问退款进度。',
    questions: {
      refund: { type: 'noul', instructions: '用户是否在询问退款？' },
      topic: {
        type: 'choice',
        instructions: '选择主题。',
        criteria: { billing: '账单问题', technical: '技术支持' },
      },
      urgency: {
        type: 'score',
        instructions: '判断紧急程度。',
        criteria: ['一般', '紧急', '非常紧急'],
      },
    },
  })

  if (result.answers.topic.status === 'ok') {
    return result.answers.topic.answer.value // 'billing' | 'technical'
  }
  return result.answers.topic.error
}
```

`noul` 返回 `probabilityTrue`；`choice` 返回候选键及完整分布；`score` 返回期望等级和按 `criteria` 排列的概率。它们都是模型输出，阈值和后续动作由消费插件决定。运行故障通过逐题 `status: 'error'` 返回；调用结构无效时抛出 `System1InputError`。

完整契约见 [API 与 provider 开发](docs/zh-CN/api.md)，调用示例见[消费插件示例](examples/consumer.ts)。当前支持 TypeSafe 模型 `jev-1.13.0` 和 `jev-latest`。

## 开发

使用 Node.js 22.19+（22.x）或 Node.js 24，以及 `package.json` 中指定版本的 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm verify
```

如需显式调用真实后端，在 `.env.local` 中设置 `TYPESAFE_API_KEY`，然后运行 `pnpm probe:live`。探针读取 `.env.local`；dsh 插件读取进程环境。常规 CI 使用本地 fixture。

更多内容见[贡献指南](CONTRIBUTING.zh-CN.md)和[发布流程](docs/zh-CN/releasing.md)。

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。
