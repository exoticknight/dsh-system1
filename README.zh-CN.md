<div align="center">

# dsh-system1

**用同一接口接入多种决策提供商与模型：在线可选 TypeSafe 提供的 Jev、Cloudflare 提供的 Clef、Nace 提供的 Drex；本地可连接 Laya，也支持兼容的自定义 provider。** Agent 和插件可用它进行内容分类、候选筛选、按标准评分或图片定位，再用结构化结果继续自己的流程。Provider 和模型支持时，请求也可包含文本、图片、音频和视频。Agent 可以调用内置的 `system1_decide` 工具，插件也能通过 `ctx.system1.decide()` 使用同一服务。

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml) [![npm 版本](https://img.shields.io/npm/v/dsh-system1)](https://www.npmjs.com/package/dsh-system1) [![License](https://img.shields.io/github/license/exoticknight/dsh-system1)](LICENSE) [![Maintained with RED](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

[![dsh.pub registry 状态](https://dsh.pub/api/badges/exoticknight/dsh-system1.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-system1) [![dsh-plugin.org 收录](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/exoticknight/dsh-system1)
[![dsh-xray 能力卡](https://img.shields.io/endpoint?url=https%3A%2F%2Funstone.github.io%2Fdsh-xray%2Fbadge%2Fexoticknight__dsh-system1.json)](https://unstone.github.io/dsh-xray/p/exoticknight__dsh-system1.html) [![DSH Market 已收录](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-zh.svg)](https://dsh.market/) [![Awesome DSH Plugin 已收录](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

简体中文 | [English](README.md)

</div>

## 提供商与模型

可直接选择内置 provider，也可以按公开契约接入其他后端。可选模型和输入能力会因 provider 与模型而异。

| 提供商 | 可选模型 | 部署方式与主要能力 |
| --- | --- | --- |
| TypeSafe（`typesafe`） | `jev-latest`、`jev-preview`、`jev-1.14.0`、`jev-1.13.0` | 托管 Jev；支持 PNG/JPEG；`box` 需要 `jev-1.14.0` 或 `jev-preview`；可选 262k 上下文。 |
| Cloudflare（`cloudflare`） | `clef`、`clef-flash`、`clef-omni` | Workers AI 或兼容的本地 Clef 服务；支持 PNG/JPEG/WebP；`clef-omni` 还支持音频和视频。 |
| Nace.AI（`nace`） | `drex-v2.0`、`drex-v1.5`、`drex-max` | 托管 Drex；只有 `drex-max` 支持图片。 |
| Laya（`laya`） | `auto`、`english`、`multilingual`、`typed-decisions` | 自建 [Laya 服务](https://github.com/NandhaKishorM/laya)；仅支持文本；API Key 可选。 |
| 自定义 | — | 实现公开的 provider 契约即可接入。 |

凭据、端点和完整能力限制见[模型服务配置](docs/providers.md)。

[System One 模型](https://systemonemodels.org/guides/what-is-a-system-one-model/)是一类决策模型，返回带类型的答案和概率，而不是生成文本。名字借用了 Kahneman 的“快思考”：它们负责门控、路由、评分这类范围明确的判断，写作和推理交给主模型。

| 原语     | 返回结果                                      |
| -------- | --------------------------------------------- |
| `noul`   | 是非判断：命题为真的概率（`probabilityTrue`） |
| `choice` | 候选键和完整概率分布                          |
| `score`  | 从 0 开始的期望等级和概率分布                 |
| `box`    | 对象在图片中的归一化边界坐标（取决于模型）    |

服务提供请求与响应校验和逐题结果，支持取消、按次超时和备选模型回退，并返回执行元数据。

## 从 npm 安装

在使用 System One 的项目中安装本包：

```sh
npm install dsh-system1
```

如需在 dsh 中启用随包提供的服务和 provider，请将 npm 包添加到实际运行的 profile。把 `<profile>` 替换为你的 profile 名称：

```sh
dsh plugin --profile <profile> add dsh-system1
```

`dsh plugin` 命令必须指定 profile；安装到一个 profile 不会在其他 profile 中启用该插件。如需从 GitHub 仓库安装，在上述命令中把 `dsh-system1` 替换为 `github:exoticknight/dsh-system1`。

随包提供的 patch 会挂载服务及内置 provider。服务默认使用 `typesafe` 的 `jev-latest`。每次尝试优先采用调用显式指定的 `timeoutMs`，否则使用该 provider 的配置值或自身默认值：TypeSafe、Laya、Cloudflare 为 800 ms，Nace 为 60,000 ms。请在对应 provider 的设置页配置超时。可在插件设置页选择默认服务和模型，并按顺序添加备用模型；在对应服务组件中填写连接参数，将密钥保存到 DSH 凭据存储，也可在启动前配置对应环境变量。每个备用模型都会获得完整超时预算，因此总耗时可随链长增加。根据后端延迟调整所选 provider 的 `timeoutMs`，本地 CPU 推理通常需要更长预算。

## 更新内容提示

在 DSH Web 中首次加载新版插件时，会自动展示更新摘要；也可从 System One 插件设置页的“更新内容”入口随时重看。摘要随插件提供，离线可读，“完整发布说明”链接需要联网。

展示记录保存在当前浏览器、当前 DSH 地址下，只保留最后展示的提示 ID。刷新和重启不会重复提示；清除站点数据、更换浏览器或回退再升级后可能再次提示。浏览器存储或跨标签协调不可用时跳过自动提示，仍可手动查看。

## Agent 工具

安装后 agent 可以直接使用 `system1_decide` 工具，无需编写消费插件。主模型可以把是否判断、分类和打分交给 System One，再根据返回的概率决定下一步。该工具使用上面配置的默认服务和模型。

此功能由 bundle 中的 `system1-tool` 组件提供，默认开启。在插件页关闭该组件即可移除工具；headless profile 中可在对应条目上设置 `disabled: true`。参数和返回值见 [API 文档](docs/api.md#agent-工具)。

## 消费插件调用

在消费插件项目中使用上面的 npm 命令安装本包，然后声明 `inject: ['system1']`，并导入本包提供的 Cordis 类型扩展：

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

`noul` 返回 `probabilityTrue`；`choice` 返回候选键及完整分布；`score` 返回期望等级和按 `criteria` 排列的概率；`box` 返回归一化图片边界。它们都是模型输出，阈值和后续动作由消费插件决定。运行故障通过逐题 `status: 'error'` 返回；调用结构无效时抛出 `System1InputError`。

完整契约见 [API 与 provider 开发](docs/api.md)，调用示例见[消费插件示例](examples/consumer.ts)。TypeSafe 支持 `jev-latest`、`jev-preview`、`jev-1.14.0` 和 `jev-1.13.0`；其他服务的模型与限制见[模型服务配置](docs/providers.md)。

## 开发

使用 `package.json` 中声明的 Node.js 和 pnpm 版本：

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm test` 使用本地 fixture 运行插件和 provider 测试，与 CI 相同；`pnpm test <plugin|providers|provider 名>` 只运行其中一部分。真实模型探针 `pnpm probe <typesafe|nace|cloudflare|laya|clef-local>` 读取 `.env.local` 中的凭据；托管 provider 探针会发送真实请求并使用账户额度，本地 target 首次运行时自动准备服务。详见[测试与真实模型验证](docs/testing.md)。

更多内容见[贡献指南](CONTRIBUTING.zh-CN.md)和[发布流程](docs/releasing.md)。

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。
