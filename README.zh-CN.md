<div align="center">

# dsh-system1

**为 DeepSeek Harness 插件提供类型安全的 System One 判断服务。** 消费插件调用 `ctx.system1.decide()`，解释返回结果并自行决定后续动作。

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml) [![npm 版本](https://img.shields.io/npm/v/dsh-system1)](https://www.npmjs.com/package/dsh-system1) [![License](https://img.shields.io/github/license/exoticknight/dsh-system1)](LICENSE) ![DSH](https://img.shields.io/badge/DSH-0.2.0--rc.2-blue) [![Maintained with RED](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

[![dsh.pub registry 状态](https://dsh.pub/api/badges/exoticknight/dsh-system1.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-system1)

简体中文 | [English](README.md)

</div>

| 原语     | 返回结果                            |
| -------- | ----------------------------------- |
| `noul`   | 命题为真的概率（`probabilityTrue`） |
| `choice` | 候选键和完整概率分布                |
| `score`  | 从 0 开始的期望等级和概率分布       |

服务提供请求与响应校验、逐题结果、取消、超时、provider 注册和执行元数据。内置 TypeSafe/Jev、Laya 和 Cloudflare Clef provider，通过 System One HTTP 协议接入。其他后端可实现公开的 provider 契约。

## 从 GitHub 安装

要求 Node.js 22.19+（22.x）或 Node.js 24、Cordis `@deepseek-ai/cordis` 4.x，以及 dsh `>=0.1.7-rc.1 <0.3.0`。Loader 已在 dsh `0.1.7-rc.1`、`0.1.7-rc.2` 和 `0.2.0-rc.2` 上通过验证。

将公开 GitHub 仓库添加到 dsh profile：

```sh
dsh plugin --profile headless add github:exoticknight/dsh-system1
```

仓库已包含插件所需的编译文件 `lib/`，安装时无需本地克隆，也无需手动拼接压缩包路径。pnpm 支持直接从 GitHub 仓库安装依赖，详见[pnpm 支持的包来源](https://pnpm.io/package-sources)。

随包提供的 patch 会挂载服务及内置 provider。默认模型为 `jev-latest`、provider id 为 `typesafe`、总超时为 800 ms。可在插件设置页选择默认服务和模型，填写连接参数，并将密钥保存到 DSH 凭据存储；也可在启动前配置对应环境变量。根据后端延迟调整 `timeoutMs`，本地 CPU 推理通常需要更长预算。

Cloudflare 使用 `cloudflare` provider 的 `clef` 或 `clef-flash`。配置步骤见[模型服务配置](docs/providers.md)。

## 消费插件调用

在消费插件项目中添加本包依赖：

```sh
pnpm add dsh-system1
```

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

完整契约见 [API 与 provider 开发](docs/api.md)，调用示例见[消费插件示例](examples/consumer.ts)。TypeSafe 支持 `jev-latest`、`jev-preview` 和 `jev-1.13.0`；其他服务的模型与限制见[模型服务配置](docs/providers.md)。

## 开发

使用 Node.js 22.19+（22.x）或 Node.js 24，以及 `package.json` 中指定版本的 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm test` 使用本地 fixture 运行插件和 provider 测试，与 CI 相同；`pnpm test <plugin|providers|provider 名>` 只运行其中一部分。真实模型探针 `pnpm probe <typesafe|cloudflare|laya|clef-local>` 读取 `.env.local` 中的凭据，本地 target 首次运行时自动准备服务，见[测试与真实模型验证](docs/testing.md)。

更多内容见[贡献指南](CONTRIBUTING.zh-CN.md)和[发布流程](docs/releasing.md)。

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。
