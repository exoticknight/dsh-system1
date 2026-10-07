# Provider setup

[简体中文](providers.md) | [English](providers.en.md)

Choose the default provider and model in DSH plugin settings, and add fallback models in the order they should be tried. Save connection details and credentials in the matching component. Individual calls can override the default with `model: { provider, model }`. Each model attempt receives the full `timeoutMs` budget, including capability checks and HTTP requests, so a fallback chain can take up to its number of models multiplied by that budget. Allow more time for local CPU inference and cold starts. See [Fallback models](api.en.md#fallback-models).

| Provider | Models | Default base URL | Credential reference |
| --- | --- | --- | --- |
| `typesafe` | `jev-latest`, `jev-preview`, `jev-1.13.0` | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`, `english`, `multilingual`, `typed-decisions` | `http://127.0.0.1:8000` | Optional `LAYA_API_KEY` |
| `cloudflare` | `clef`, `clef-flash` | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

Providers resolve keys through DSH credentials when available, otherwise through the process environment. Keys are never displayed. On a provider component's settings page, enter the API key and press Save with the connection details to store it in DSH credentials; saving with the field blank keeps the existing key. The page marks a setting as overridden only when it differs from the package default, and Reset writes the package default back. Independent provider plugins support custom registration and credential names through `id` and `apiKeyEnv`.

## Local deployment scope

See [local services and live validation](testing.en.md) for setup, probes, and validation boundaries.

Laya provides an [official local HTTP server](https://github.com/NandhaKishorM/laya) compatible with this plugin's `/v1/systemone` transport. Cloudflare publishes [Clef-flash weights and decision inference code](https://huggingface.co/Cloudflare/clef-flash). Local inference requires both the backbone and the joint schema head; a generic chat server does not implement that decision interface. The repository's local wrapper mirrors the Workers AI REST route, so the same `cloudflare` provider can use it by pointing `baseURL` at the local service. Local Clef inference and the Cloudflare Workers AI endpoint require separate validation.

TypeSafe's [public setup instructions](https://docs.typesafe.ai/introduction/quickstart) describe a hosted API. Its [model documentation](https://docs.typesafe.ai/models) does not provide a deployable local Jev release. This project validates TypeSafe through real hosted calls and does not count protocol fixtures as local Jev inference.

## Cloudflare Clef

Create an API token with Workers AI access and obtain your Account ID from Cloudflare. In the Cloudflare component, enter the Account ID and the token as the API key, then press Save. You can also set `CLOUDFLARE_ACCOUNT_ID` in the dsh process environment.

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

See [testing and live model validation](testing.en.md#cloudflare-credentials) for creating credentials, the free allocation, and the live probe.
