# 模型服务配置

[简体中文](providers.md) | [English](providers.en.md)

在 DSH 插件设置中选择默认服务与模型，在对应服务组件中保存连接参数和密钥。调用方也可通过 `model: { provider, model }` 逐次选择。总超时包括模型能力检查与 HTTP 调用；本地模型首次加载和 CPU 推理应使用更长的预算。

| Provider | 模型 | 默认服务地址 | 凭据引用 |
| --- | --- | --- | --- |
| `typesafe` | `jev-latest`、`jev-preview`、`jev-1.13.0` | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`、`english`、`multilingual`、`typed-decisions` | `http://127.0.0.1:8000` | `LAYA_API_KEY`，可选 |
| `cloudflare` | `clef`、`clef-flash` | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

密钥优先通过 DSH credentials 服务解析；宿主没有该服务时读取进程环境。密钥不会回显。各独立 provider 插件可用 `id` 和 `apiKeyEnv` 自定义注册名及凭据引用。

## Cloudflare Clef

在 Cloudflare 控制台创建有 Workers AI 调用权限的 API token，并取得 Account ID。在 Cloudflare 组件中填写 Account ID，将 token 保存到凭据字段。Account ID 也可通过启动进程的 `CLOUDFLARE_ACCOUNT_ID` 配置。

保留默认 API 根地址即可直连 Cloudflare。插件会拼接 `/accounts/{accountId}/ai/run/@cf/cloudflare/{model}`，请求体使用短模型名。包内 adapter 同时接受 `@cf/cloudflare/clef` 和 `@cf/cloudflare/clef-flash`。

```ts
const result = await ctx.system1.decide({
  model: { provider: 'cloudflare', model: 'clef-flash' },
  state: '支付页面持续返回错误。',
  questions: { urgent: { type: 'noul', instructions: '是否需要立即处理？' } },
  timeoutMs: 10000,
})
```

Cloudflare 对每次请求最多接受 64 道题，题号最长 100 个字符，可使用字母、数字、下划线、点和连字符。上下文信息为 65,536 tokens；长输入可能由后端截断，应在业务侧控制输入长度。插件当前接入字符串、对象或数组形式的 state 与三种判断原语。参见 [Clef 官方接口](https://developers.cloudflare.com/workers-ai/models/clef/)和 [Workers AI REST 入门](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)。

嵌入使用时可直接创建 provider；`fetch` 可选，用于替换传输或本地协议 fixture：

```ts
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerProvider('cloudflare', backend))
```

开发时可在 `.env.local` 中设置 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`，构建后运行 `pnpm probe:cloudflare`，验证三种判断原语。此探针会发起真实云端请求。缺少配置时退出码为 2；模型回答未通过公共契约校验时退出码为 1。
