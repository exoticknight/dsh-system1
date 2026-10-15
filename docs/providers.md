# 模型服务配置

[简体中文](providers.md) | [English](providers.en.md)

在 DSH 插件设置中选择默认服务与模型，并按顺序添加备用模型；在对应服务组件中保存连接参数和密钥。调用方也可通过 `model: { provider, model }` 逐次选择。每次模型尝试都会获得完整的 `timeoutMs` 预算（包括能力检查与 HTTP 调用），因此兜底链总时长可达到模型数乘以预算。本地模型首次加载和 CPU 推理应使用更长的预算。详见 [备用模型](api.md#备用模型)。

| Provider | 模型 | 默认服务地址 | 凭据引用 |
| --- | --- | --- | --- |
| `typesafe` | `jev-latest`、`jev-preview`、`jev-1.14.0`、`jev-1.13.0` | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`、`english`、`multilingual`、`typed-decisions` | `http://127.0.0.1:8000` | `LAYA_API_KEY`，可选 |
| `cloudflare` | `clef`、`clef-flash`、`clef-omni` | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

`jev-1.14.0` 和 `jev-1.13.0` 是固定版本。`jev-latest` 指向最新稳定版，`jev-preview` 指向最新发布版；别名映射会随 TypeSafe 更新。需要固定行为时选择版本 ID。详见 TypeSafe 的[模型目录](https://docs.typesafe.ai/models)。

密钥优先通过 DSH credentials 服务解析；宿主没有该服务时读取进程环境。密钥不会回显。在服务组件的设置页填写 API Key 后，与连接参数一起点「保存设置」写入 DSH 凭据存储；留空保存会保留已有密钥。设置页仅在当前值与包默认值不同时显示「已覆盖」，「恢复默认值」会写回包默认值。各独立 provider 插件可用 `id` 和 `apiKeyEnv` 自定义注册名及凭据引用。

## 本地部署范围

启动、复测与验证边界见[测试与真实模型验证](testing.md)。

Laya 提供[官方本地 HTTP 服务](https://github.com/NandhaKishorM/laya)，可直接接入本插件的 `/v1/systemone` 传输。Cloudflare 发布了 [Clef-flash 权重和决策推理代码](https://huggingface.co/Cloudflare/clef-flash)；本地运行需要同时加载 backbone 和 joint schema head，普通聊天模型服务不能替代该决策接口。仓库提供的本地包装复刻 Workers AI REST 路径，同一个 `cloudflare` provider 将 `baseURL` 指向本地即可使用；本地 Clef 推理与 Cloudflare Workers AI 云端接口需要分别验证。

TypeSafe 的[公开部署说明](https://docs.typesafe.ai/introduction/quickstart)目前提供托管 API；[模型文档](https://docs.typesafe.ai/models)未提供可据此部署的 Jev 本地发行版。本项目通过真实托管调用验证 TypeSafe，不将本地协议模拟计作 Jev 本地推理。

### Jev 图片、Box 与长上下文

System One 请求可附带最多 4 张 PNG、JPEG 或 WebP 图片，附件对所有问题共享。Jev 当前支持 PNG/JPEG；图片会被编码为 TypeSafe `assets` 并自动发送 `TypeSafe-Danger-Zone-Images` 请求头。TypeSafe 将图片和 Box 标为实验能力，格式、限制和准确性可能随版本变化。Jev 1.14（或当前映射到 1.14 的 `jev-preview`）支持 `box`，结果中的四条边是 0–1 之间的归一化坐标。通过 `longContext: true` 可显式请求 262k tokens；默认仍按每请求 64k、每题 32k 的常规上限执行。详见[TypeSafe 图片说明](https://docs.typesafe.ai/images)、[Box 说明](https://docs.typesafe.ai/primitives/box)和[上下文限制](https://docs.typesafe.ai/models#long-context)。

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

Cloudflare 对每次请求最多接受 64 道题，题号最长 100 个字符，可使用字母、数字、下划线、点和连字符。上下文上限按模型分别为 `clef` 65,536、`clef-flash` 24,576、`clef-omni` 64,000 tokens；长输入可能由后端截断，应在业务侧控制输入长度。统一 `images` 附件支持 PNG、JPEG 和 WebP，每张最大 4 MiB、总计最大 8 MiB，最多 4 张；provider 会转换成 Cloudflare 所需的 base64 data URL。Clef-omni 上游也接受音频和视频，但当前公共请求契约只暴露图片输入。参见 [Clef 官方接口](https://developers.cloudflare.com/workers-ai/models/clef/)、[Clef-omni 官方接口](https://developers.cloudflare.com/workers-ai/models/clef-omni/)和 [Workers AI REST 入门](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)。

嵌入使用时可直接创建 provider；`fetch` 可选，用于替换传输或本地协议 fixture：

```ts
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerProvider('cloudflare', backend))
```

凭据申请、免费额度和真实调用探针见[测试与真实模型验证](testing.md#cloudflare-凭据)。
