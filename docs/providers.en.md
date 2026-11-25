# Provider setup

[简体中文](providers.md) | [English](providers.en.md)

In **System One** settings, use an operation's tab in **Operations** to choose its primary model and fallback order. Open the provider component from DSH's **Components** list. Set its endpoint, credentials, and optional `timeoutMs` in **Connection settings**, or check **Models and capabilities** for supported inputs and saved routes. The same connection settings apply wherever that instance is used.

Each model shows where it appears in saved routes, for example **Locate · Primary model** or **Locate · Fallback 2**. Fallback numbers follow the full route across providers. Models absent from saved routes show **Not selected**. The bundled component rows provide these settings pages. Changing a row's provider instance `id` keeps the same page; a separately added component row needs its own settings contribution.

An enabled operation can use a per-call `model: { provider, model }` instead of its route. Each model gets its full timeout budget, including capability checks and HTTP requests. Timeout precedence is per-call `timeoutMs`, the selected provider's timeout setting, then that provider's default. Leave the setting blank to use the default. Allow more time for local CPU inference and cold starts. See [Fallback models](api.en.md#fallback-models).

| Provider | Models | Default timeout | Default base URL | Credential reference |
| --- | --- | ---: | --- | --- |
| `typesafe` | `jev-latest`, `jev-preview`, `jev-1.14.0`, `jev-1.13.0` | 800 ms | `https://api.typesafe.ai` | `TYPESAFE_API_KEY` |
| `laya` | `auto`, `english`, `multilingual`, `typed-decisions` | 800 ms | `http://127.0.0.1:8000` | Optional `LAYA_API_KEY` |
| `meragpt` | `decider-1`, `decider-1.1` | 10,000 ms | `https://meragpt.com` | `MERAGPT_API_KEY` |
| `liquid` | `d1.2`, `d1.2-ultra` | 10,000 ms | `https://api.liquid.ai/decisions` | `LIQUID_API_KEY` |
| `nace` | `drex-v2.0`, `drex-max-v1.1`, `drex-max-finance` | 60,000 ms | `https://console.nace.ai` | `NACE_API_KEY` |
| `cloudflare` | `clef`, `clef-flash`, `clef-omni` | 800 ms | `https://api.cloudflare.com/client/v4` | `CLOUDFLARE_API_TOKEN` |

`jev-1.14.0` and `jev-1.13.0` are version-pinned IDs. `jev-latest` points to the newest stable release, while `jev-preview` points to the newest release; TypeSafe can move either alias over time. Choose a version ID when you need a fixed model. See TypeSafe's [model catalog](https://docs.typesafe.ai/models).

This project maintains provider model catalogs and capabilities explicitly; it does not overwrite them at runtime. When following an upstream update, verify model IDs, input formats, and limits against the official changelog, model page, or schema, then update that provider's model catalog, capability declaration, transport fixtures, and bilingual docs. A dynamic alias follows a model name, not its newly added capabilities. Mutable upstream pricing is outside the product contract.

Providers resolve keys through DSH credentials when available, otherwise through the process environment. Keys are never displayed. On a provider component's settings page, enter the API key and press Save with the connection details to store it in DSH credentials; saving with the field blank keeps the existing key. The page marks a setting as overridden only when it differs from the package default, and Reset writes the package default back. Independent provider plugins support custom registration and credential names through `id` and `apiKeyEnv`.

## Local deployment scope

See [local services and live validation](testing.en.md) for setup, probes, and validation boundaries.

Laya provides an [official local HTTP server](https://github.com/NandhaKishorM/laya) compatible with this plugin's `/v1/systemone` transport. Laya 0.5.3 passed the Chinese multilingual probe on CPU. Cloudflare publishes [Clef-flash weights and decision inference code](https://huggingface.co/Cloudflare/clef-flash). Local inference requires both the backbone and the joint schema head; a generic chat server does not implement that decision interface. The repository's local wrapper mirrors the Workers AI REST route, so the same `cloudflare` provider can use it by pointing `baseURL` at the local service. Local Clef inference and the Cloudflare Workers AI endpoint require separate validation.

TypeSafe's [public setup instructions](https://docs.typesafe.ai/introduction/quickstart) describe a hosted API. Its [model documentation](https://docs.typesafe.ai/models) does not provide a deployable local Jev release. This project validates TypeSafe through real hosted calls and does not count protocol fixtures as local Jev inference.

### Jev images, Box, and long context

The public request has resource-safety ceilings of 16 items per attachment type, 16 MiB per item, and 64 MiB total decoded across all attachments; model capabilities may be stricter. Jev supports up to four PNG/JPEG images, 16 MiB each and 16 MiB total; the provider encodes them as TypeSafe `assets` and automatically sends the `TypeSafe-Danger-Zone-Images` header. TypeSafe labels images and Box experimental; their format, limits, and accuracy may change between releases. Jev 1.14 (or `jev-preview` while it points to 1.14) supports `box`; its four edges are normalized coordinates from 0 to 1. Set `longContext: true` to opt into 262k tokens. The default remains 64k per request and 32k per question. See TypeSafe's [image guide](https://docs.typesafe.ai/images), [Box guide](https://docs.typesafe.ai/primitives/box), and [context limits](https://docs.typesafe.ai/models#long-context).

## Nace.AI Drex

In DSH, save the key on the `nace` provider's settings page; it is stored in DSH credentials under `NACE_API_KEY`. The provider falls back to the `NACE_API_KEY` process environment variable. Keep the default API root `https://console.nace.ai`, or override it with `baseURL` for a compatible endpoint. The provider settings default to `drex-v2.0`; this does not change the service-wide default of TypeSafe `jev-latest`. See Nace's [authentication guide](https://console.nace.ai/docs/drex/guides/authentication) to create or rotate keys.

| Model | Questions per request | Token limit | Images |
| --- | ---: | --- | --- |
| `drex-v2.0` | 512 | Up to 131,072 for state; up to 262,144 for state plus the longest question | No |
| `drex-max-v1.1` | 512 | 262,144 for the whole packed request, including state, all questions, images, and formatting | Up to 8 |
| `drex-max-finance` | 512 | Same whole-request 262,144-token limit as v1.1; specialized for financial decisions | Up to 8 |

If a default, fallback, or per-call model still specifies the retired ID `drex-v1.5` or `drex-max`, switch to `drex-max-v1.1`. The plugin returns `unsupported` for retired IDs and leaves saved settings as they are. Choose a listed version ID to pin a model; Nace may move the `drex-latest` alias.

Drex may round each probability in a `choice` or `score` distribution to four decimal places, so the entries can add up slightly above or below 1. DSH renormalizes totals only within the maximum error from that per-entry rounding; larger deviations follow the regular answer validation rules.

`drex-max-v1.1` and `drex-max-finance` accept PNG, JPEG, and WebP (up to eight images, 16 MiB each, 32 MiB total, and 40 megapixels per image). Each question allows up to 255 `choice` options or `score` levels. Nace enforces the token limits in the table.

Nace limits the serialized UTF-8 JSON body to 4 MiB, counting `state`, `questions`, and non-empty `images`, but not the top-level `model`. Small images stay inline; when inline images would exceed the body limit, the adapter uploads only enough images to fit and sends account-level file references. The upload endpoint does not use a workspace. The adapter attempts to delete uploads after inference; if cleanup fails, Nace keeps account-level uploads for 24 hours by default. Removed files can take up to 35 days to disappear from backups. Avoid this provider path for images that policy does not allow to be temporarily uploaded. See Nace's [model catalog](https://console.nace.ai/docs/drex/reference/models), [request limits](https://console.nace.ai/docs/drex/reference/limits), [Drex Max image guide](https://console.nace.ai/docs/drex/guides/drex-max), and [data retention policy](https://console.nace.ai/docs/perception/data-retention).

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

For image input, select `drex-max-v1.1` or `drex-max-finance` and use the shared request `images` field:

```ts
const result = await ctx.system1.decide({
  model: { provider: 'nace', model: 'drex-max-v1.1' },
  state: 'Inspect Image 1.',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  questions: {
    damaged: { type: 'noul', instructions: 'Does Image 1 show a damaged item?' },
  },
})
```

See [testing and live model validation](testing.en.md#nace-credentials-and-live-probe) before sending a real request.

### Locate text or image regions

The same connection supports [Locate](locate.en.md): `drex-max-locate` finds text passages (up to 28,000 Unicode code points), and `drex-max-box` finds regions in one PNG, JPEG, or WebP (up to 4,000,000 characters in its inline data URL). Both allow up to 4,000 code points of instructions after trimming. Nace enforces the 32,768-token encoded-input limit. The dedicated endpoints do not upload temporary files. Availability depends on the deployment and account. The endpoints return `403` for Zero-retention accounts or missing inference permission; either refusal stops fallback as soon as the HTTP status arrives. See the [Nace Locate and Box guide](https://console.nace.ai/docs/drex/guides/locate-and-box).

## meraGPT Decider 1.1

Save your API key on the `meragpt` settings page under `MERAGPT_API_KEY`. The default API root is `https://meragpt.com`; override it with `baseURL`. Choose `decider-1` to follow the latest 1.x release, or `decider-1.1` to pin the model. The provider also accepts `sd-1` and `state-decider-1` as aliases for `decider-1`.

Decider supports `noul`, `choice`, and `score`. Send up to 64 questions, with up to 255 `choice` options or 32 `score` levels per question. The state and any one question share a 32,768-token budget, including images. You can attach up to eight PNG, JPEG, or WebP images of at most 8 MB (8,000,000 bytes) each.

The API uses prepaid credit. Check your balance before inference; HTTP 402 indicates insufficient credit. See the [Decider API](https://meragpt.com/docs/decider) and [meraGPT live probe](testing.en.md#meragpt-credentials-and-live-probe).

## Liquid AI

Save your API key on the `liquid` settings page under `LIQUID_API_KEY`. The default `baseURL` is `https://api.liquid.ai/decisions`. Include the compatible path prefix in custom base URLs; the plugin appends `/v1/systemone`. Choose `d1.2` or `d1.2-ultra`. The default timeout is 10,000 ms.

Both models support `noul`, `choice`, and `score`. Send up to 128 questions; the shared state and media plus any one question can use up to 65,536 tokens. A request can include up to eight PNG/JPEG/WebP images and up to eight WAV/MP3 clips, with up to 300 seconds of audio total. Keep the whole JSON body, including encoded attachments, under 4.5 MB (4,500,000 bytes). For formats and backend limits, see the [Liquid API reference](https://docs.liquid.ai/lfm/models/d1).

Both models passed live text scoring, image classification, and audio checks. See [the probe and live example results](testing.en.md#liquid-ai-live-probe).

### Locate text or image regions

Both `d1.2` and `d1.2-ultra` support text and image [Locate](locate.en.md). A Locate request returns up to 16 matches and reports when there may be more. The text portion is limited to 250,000 UTF-8 bytes and the complete encoded JSON must stay under 4.5 MB. For one image, Liquid also enforces an aspect ratio of at most 100:1 and at most 10,000 patches of 32 × 32 pixels. Locate uses the same Liquid credentials, endpoint, and timeout as Decision. See the [Liquid Locate protocol](https://docs.liquid.ai/lfm/models/d1#typed-answers).

## Cloudflare Clef

Choose `clef` or `clef-flash` for text and images, or `clef-omni` for text, images, audio, and video. Sending video to Cloudflare-hosted Clef or Clef-flash returns HTTP 422.

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

Cloudflare accepts up to 64 questions per request, with up to 255 `choice` options or 10 `score` levels per question. Question IDs are at most 100 characters and use letters, digits, underscores, dots, or hyphens. The context limit is 65,536 tokens for `clef`, 24,576 for `clef-flash`, and 64,000 for `clef-omni`; the backend may truncate long inputs, so control input size in your application. The shared `images` field supports PNG, JPEG, and WebP, with up to four images, 4 MiB per image, and 8 MiB total; the provider converts them to Cloudflare's base64 data URLs.

In the Clef family, `clef-omni` handles audio and video: audio uses `audio/wav` or `audio/mpeg`, up to four clips of 8 MiB each; video uses `video/mp4` or `video/webm`, up to two clips of 16 MiB each. Decoded audio and video share a 16 MiB limit. Cloudflare validates the 300-second audio and 60-second video duration limits; video is sampled at 2 fps. The image budget is separate. Pass each attachment as Base64 without a prefix; the provider adds the data URL prefix and sends top-level `audio` and `videos` fields. Other models are skipped before a request is sent, using the existing fallback chain. See the [Clef API](https://developers.cloudflare.com/workers-ai/models/clef/), [Clef-omni API](https://developers.cloudflare.com/workers-ai/models/clef-omni/), and [Workers AI REST setup](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).

Cloudflare's public examples explicitly show `audio/mpeg` and `video/mp4`. This package maps WAV and WebM to `audio/wav` and `video/webm`, respectively, but those exact MIME values have not yet been validated against an account schema or live request. Validate WAV or WebM with a small sample before relying on it; MP3 and MP4 have official request examples.

The Omni capabilities above target Cloudflare's hosted API. A custom `baseURL` must implement the same model and media contract; the repository's local Clef test wrapper currently provides `clef-flash` only.

For embedding, create the provider directly. An optional `fetch` implementation supports custom transport or local protocol fixtures:

```ts
import { decideOperation } from 'dsh-system1'
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
  apiKey: process.env.CLOUDFLARE_API_TOKEN ?? '',
})
ctx.effect(() => ctx.system1.registerImplementation(decideOperation, 'cloudflare', backend))
```

See [testing and live model validation](testing.en.md#cloudflare-credentials) for creating credentials and running the live probe.
