# Provider setup

[简体中文](providers.md) | [English](providers.en.md)

Choose the default provider and model in DSH plugin settings, and add fallback models in the order they should be tried. Save connection details and credentials in the matching component. Individual calls can override the default with `model: { provider, model }`. Each model attempt receives the full timeout budget, including capability checks and HTTP requests, so a fallback chain can take up to its number of models multiplied by that budget. Timeout precedence is per-call `timeoutMs`, explicitly configured service `timeoutMs`, provider default, then the legacy 800 ms fallback. Nace defaults to 60 seconds; the other built-in providers default to 800 ms. Allow more time for local CPU inference and cold starts. See [Fallback models](api.en.md#fallback-models).

| Provider | Models | Default base URL | Credential reference |
| --- | --- | --- | --- |
| `typesafe` | `jev-latest`, `jev-preview`, `jev-1.14.0`, `jev-1.13.0` | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`, `english`, `multilingual`, `typed-decisions` | `http://127.0.0.1:8000` | Optional `LAYA_API_KEY` |
| `nace` | `drex-v2.0`, `drex-v1.5`, `drex-max` | `https://console.nace.ai` | `NACE_API_KEY` |
| `cloudflare` | `clef`, `clef-flash`, `clef-omni` | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

`jev-1.14.0` and `jev-1.13.0` are version-pinned IDs. `jev-latest` points to the newest stable release, while `jev-preview` points to the newest release; TypeSafe can move either alias over time. Choose a version ID when you need a fixed model. See TypeSafe's [model catalog](https://docs.typesafe.ai/models).

This project maintains provider model catalogs and capabilities explicitly; it does not overwrite them at runtime. When following an upstream update, verify model IDs, input formats, and limits against the official changelog, model page, or schema, then update that provider's model catalog, capability declaration, transport fixtures, and bilingual docs. A dynamic alias follows a model name, not its newly added capabilities. Mutable upstream pricing is outside the product contract.

Providers resolve keys through DSH credentials when available, otherwise through the process environment. Keys are never displayed. On a provider component's settings page, enter the API key and press Save with the connection details to store it in DSH credentials; saving with the field blank keeps the existing key. The page marks a setting as overridden only when it differs from the package default, and Reset writes the package default back. Independent provider plugins support custom registration and credential names through `id` and `apiKeyEnv`.

## Local deployment scope

See [local services and live validation](testing.en.md) for setup, probes, and validation boundaries.

Laya provides an [official local HTTP server](https://github.com/NandhaKishorM/laya) compatible with this plugin's `/v1/systemone` transport. Cloudflare publishes [Clef-flash weights and decision inference code](https://huggingface.co/Cloudflare/clef-flash). Local inference requires both the backbone and the joint schema head; a generic chat server does not implement that decision interface. The repository's local wrapper mirrors the Workers AI REST route, so the same `cloudflare` provider can use it by pointing `baseURL` at the local service. Local Clef inference and the Cloudflare Workers AI endpoint require separate validation.

TypeSafe's [public setup instructions](https://docs.typesafe.ai/introduction/quickstart) describe a hosted API. Its [model documentation](https://docs.typesafe.ai/models) does not provide a deployable local Jev release. This project validates TypeSafe through real hosted calls and does not count protocol fixtures as local Jev inference.

### Jev images, Box, and long context

The public request accepts up to eight PNG, JPEG, or WebP attachments shared by every question; a provider or model may impose a lower limit. Jev supports up to four PNG/JPEG images; the provider encodes them as TypeSafe `assets` and automatically sends the `TypeSafe-Danger-Zone-Images` header. TypeSafe labels images and Box experimental; their format, limits, and accuracy may change between releases. Jev 1.14 (or `jev-preview` while it points to 1.14) supports `box`; its four edges are normalized coordinates from 0 to 1. Set `longContext: true` to opt into 262k tokens. The default remains 64k per request and 32k per question. See TypeSafe's [image guide](https://docs.typesafe.ai/images), [Box guide](https://docs.typesafe.ai/primitives/box), and [context limits](https://docs.typesafe.ai/models#long-context).

## Nace.AI Drex

In DSH, save the key on the `nace` provider's settings page; it is stored in DSH credentials under `NACE_API_KEY`. The provider falls back to the `NACE_API_KEY` process environment variable. Keep the default API root `https://console.nace.ai`, or override it with `baseURL` for a compatible endpoint. The provider settings default to `drex-v2.0`; this does not change the service-wide default of TypeSafe `jev-latest`. See Nace's [authentication guide](https://console.nace.ai/docs/drex/guides/authentication) to create or rotate keys.

| Model | Questions per request | State limit | State + longest question | Images |
| --- | ---: | ---: | ---: | --- |
| `drex-v1.5` | 512 | 131,072 tokens | 139,264 tokens | No |
| `drex-v2.0` | 512 | 131,072 tokens | 262,144 tokens | No |
| `drex-max` | 16 | 131,072 tokens | 262,144 tokens | Up to 8 |

Use the versioned IDs for reproducible calls; the provider does not list the moving `drex-latest` alias. `box` is not supported. The DSH service exposes Nace's token limits as capability metadata but has no Drex tokenizer, so Nace enforces those token limits.

Drex may round each probability in a `choice` or `score` distribution to four decimal places, so the entries can add up slightly above or below 1. DSH renormalizes totals only within the maximum error from that per-entry rounding; larger deviations follow the regular answer validation rules.

Only `drex-max` accepts PNG, JPEG, and WebP images (up to 8 images, 16 MiB each, 32 MiB total, and 40 megapixels per image). It also allows up to 255 options per `choice` question and 255 levels per `score` question. Its state-plus-longest-question limit is 262,144 tokens; across questions whose token count exceeds 131,072, the request total is capped at 1,048,576 tokens, including image tokens. Nace limits the serialized UTF-8 JSON body to 4 MiB, counting `state`, `questions`, and non-empty `images`, but not the top-level `model`. Small images stay inline; when inline images would exceed the body limit, the adapter uploads only enough images to fit and sends account-level file references. The upload endpoint does not use a workspace. The adapter attempts to delete uploads after inference; if cleanup fails, Nace keeps account-level uploads for 24 hours by default. Removed files can take up to 35 days to disappear from backups. Avoid this provider path for images that policy does not allow to be temporarily uploaded. See Nace's [model catalog](https://console.nace.ai/docs/drex/reference/models), [request limits](https://console.nace.ai/docs/drex/reference/limits), [Drex Max image guide](https://console.nace.ai/docs/drex/guides/drex-max), and [data retention policy](https://console.nace.ai/docs/perception/data-retention).

For example, choose Nace per call without changing the service default:

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-v2.0' },
  state: 'A customer says a refund has been pending for two weeks.',
  questions: {
    refund: { type: 'noul', instructions: 'Is the customer asking about a refund?' },
  },
})
```

For image input, select `drex-max` and use the shared request `images` field:

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-max' },
  state: 'Inspect Image 1.',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  questions: {
    damaged: { type: 'noul', instructions: 'Does Image 1 show a damaged item?' },
  },
})
```

See [testing and live model validation](testing.en.md#nace-credentials-and-live-probe) before sending a real request.

## Cloudflare Clef

Create an API token with Workers AI access and obtain your Account ID from Cloudflare. In the Cloudflare component, enter the Account ID and the token as the API key, then press Save. You can also set `CLOUDFLARE_ACCOUNT_ID` in the dsh process environment.

Keep the default API root for direct Cloudflare access. The plugin appends `/accounts/{accountId}/ai/run/@cf/cloudflare/{model}` and sends the short model name in the request body. The adapter also accepts the full identifiers `@cf/cloudflare/clef`, `@cf/cloudflare/clef-flash`, and `@cf/cloudflare/clef-omni`.

```ts
const result = await ctx.system1.decide({
  model: { provider: 'cloudflare', model: 'clef-flash' },
  state: 'The checkout page keeps returning errors.',
  questions: { urgent: { type: 'noul', instructions: 'Does this need immediate attention?' } },
  timeoutMs: 10000,
})
```

Cloudflare accepts up to 64 questions per request. Question IDs are at most 100 characters and use letters, digits, underscores, dots, or hyphens. The context limit is 65,536 tokens for `clef`, 24,576 for `clef-flash`, and 64,000 for `clef-omni`; the backend may truncate long inputs, so control input size in your application. The shared `images` field supports PNG, JPEG, and WebP, with up to four images, 4 MiB per image, and 8 MiB total; the provider converts them to Cloudflare's base64 data URLs.

Only `clef-omni` accepts audio and video: audio uses `audio/wav` or `audio/mpeg`, up to four clips of 8 MiB each; video uses `video/mp4` or `video/webm`, up to two clips of 16 MiB each. Decoded audio and video share a 16 MiB limit. Cloudflare validates the 300-second audio and 60-second video duration limits; video is sampled at 2 fps. The image budget is separate. Pass each attachment as Base64 without a prefix; the provider adds the data URL prefix and sends top-level `audio` and `videos` fields. Other models are skipped before a request is sent, using the existing fallback chain. See the [Clef API](https://developers.cloudflare.com/workers-ai/models/clef/), [Clef-omni API](https://developers.cloudflare.com/workers-ai/models/clef-omni/), and [Workers AI REST setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

Cloudflare's public examples explicitly show `audio/mpeg` and `video/mp4`. This package maps WAV and WebM to `audio/wav` and `video/webm`, respectively, but those exact MIME values have not yet been validated against an account schema or live request. Validate WAV or WebM with a small sample before relying on it; MP3 and MP4 have official request examples.

The Omni capabilities above target Cloudflare's hosted API. A custom `baseURL` must implement the same model and media contract; the repository's local Clef test wrapper currently provides `clef-flash` only.

For embedding, create the provider directly. An optional `fetch` implementation supports custom transport or local protocol fixtures:

```ts
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerProvider('cloudflare', backend))
```

See [testing and live model validation](testing.en.md#cloudflare-credentials) for creating credentials and running the live probe.
