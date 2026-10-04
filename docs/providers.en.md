# Provider setup

[简体中文](providers.md) | [English](providers.en.md)

Choose the default provider and model in DSH plugin settings, then save connection details and credentials in the matching component. Individual calls can override the default with `model: { provider, model }`. The timeout covers capability checks and HTTP requests; allow more time for local CPU inference and cold starts.

| Provider | Models | Default base URL | Credential reference |
| --- | --- | --- | --- |
| `typesafe` | `jev-latest`, `jev-preview`, `jev-1.13.0` | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`, `english`, `multilingual`, `typed-decisions` | `http://127.0.0.1:8000` | Optional `LAYA_API_KEY` |
| `cloudflare` | `clef`, `clef-flash` | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

Providers resolve keys through DSH credentials when available, otherwise through the process environment. Keys are never displayed. Independent provider plugins support custom registration and credential names through `id` and `apiKeyEnv`.

## Cloudflare Clef

Create an API token with Workers AI access and obtain your Account ID from Cloudflare. Enter the Account ID in the Cloudflare component and save the token in its credential field. You can also set `CLOUDFLARE_ACCOUNT_ID` in the dsh process environment.

Keep the default API root for direct Cloudflare access. The plugin appends `/accounts/{accountId}/ai/run/@cf/cloudflare/{model}` and sends the short model name in the request body. The adapter also accepts the full identifiers `@cf/cloudflare/clef` and `@cf/cloudflare/clef-flash`.

```ts
const result = await ctx.system1.decide({
  model: { provider: 'cloudflare', model: 'clef-flash' },
  state: 'The checkout page keeps returning errors.',
  questions: { urgent: { type: 'noul', instructions: 'Does this need immediate attention?' } },
  timeoutMs: 10000,
})
```

Cloudflare accepts up to 64 questions per request. Question IDs are at most 100 characters and use letters, digits, underscores, dots, or hyphens. Its context window is 65,536 tokens; the backend may truncate long inputs, so control input size in your application. This plugin exposes string, object, or array state and the three decision primitives. See the [Clef API](https://developers.cloudflare.com/workers-ai/models/clef/) and [Workers AI REST setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

For embedding, create the provider directly. An optional `fetch` implementation supports custom transport or local protocol fixtures:

```ts
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerProvider('cloudflare', backend))
```

For development, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env.local`, build the package, then run `pnpm probe:cloudflare` to check all three primitives. This sends a real cloud request. Missing configuration exits with code 2; answers failing the public contract exit with code 1.
