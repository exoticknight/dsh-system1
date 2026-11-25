# API and provider development

[简体中文](api.md) | [English](api.en.md)

## Requests and results

`decide({ state, questions, images?, audio?, videos?, longContext?, model?, signal?, timeoutMs? })` accepts a named set of questions. `model` has the shape `{ provider, model }`; when omitted, the service tries its `defaultModel` and `fallbackModels` in order. If no model is available, the call throws `System1InputError`. `timeoutMs` is a positive integer in milliseconds. Its precedence is the per-call value, the selected provider's `timeoutMs` setting, then that provider's own default. TypeSafe, Laya, and Cloudflare default to 800 ms; meraGPT and Liquid AI default to 10,000 ms, and Nace to 60,000 ms. Each model attempt gets the full budget, including capability checks and the backend call.

0.4.0 migration: service-level `timeoutMs` has been removed, and residual values in older service configuration are ignored. Move custom timeouts to the matching provider settings page. Third-party `System1Provider` implementations must replace `defaultTimeoutMs` with `timeoutMs(): number`; `ModelCapabilities` now requires explicit question limits and count/byte limits for every supported attachment type.

The package root exports the service, error classes, and types. `dsh-system1/contracts` exports the public types, including `ProviderModel`; `dsh-system1/providers` exports `findProviderModel`. Each `dsh-system1/providers/<id>` subpath exports the Cordis plugin, a `create…Provider` factory, and its model catalog. Use `typesafe`, `laya`, `nace`, `meragpt`, `liquid`, or `cloudflare` for `<id>`. See [provider setup](providers.en.md) for connection details and model selection.

Consumer plugins declare `inject: ['system1']`. See the [consumer example](../examples/consumer.ts).

```ts
const result = await ctx.system1.decide({
  state: 'The user asked about a refund.',
  questions: {
    refund: {
      type: 'noul',
      instructions: 'Is the user asking about a refund?',
    },
    topic: {
      type: 'choice',
      instructions: 'Choose a topic.',
      criteria: { billing: 'Billing refund', technical: 'Technical support' },
    },
    urgency: {
      type: 'score',
      instructions: 'Rate urgency.',
      criteria: ['Normal', 'Urgent', 'Critical'],
    },
  },
})
if (result.answers.topic.status === 'ok') {
  const topic = result.answers.topic.answer.value
}
```

`noul` returns `probabilityTrue`; `choice` returns the candidate key and full `probabilities`; `score` returns an expected zero-based level and a distribution ordered by `criteria`. A `box` question returns `{ type: 'box', box: { top, bottom, left, right }, confidence? }`, with edges as fractions from 0 to 1. Probabilities and coordinates are model outputs, so consumers choose their own action thresholds.

`images`, `audio`, and `videos` are shared across all questions in a request. Each attachment is `{ mediaType, data }`, with standard padded Base64 in `data` and no data-URL prefix. The shared layer allows up to 16 items per type, 16 MiB per item, and 64 MiB decoded across all attachments. Providers can impose tighter limits:

- **Images**: PNG, JPEG, or WebP. Nace Max, meraGPT, and Liquid allow up to eight images; TypeSafe and Cloudflare allow up to four. TypeSafe accepts PNG and JPEG. A `box` question requires at least one image and a model that supports that primitive.
- **Audio**: WAV (`audio/wav`) or MP3 (`audio/mpeg`), on [Liquid AI](providers.en.md#liquid-ai) and [Cloudflare `clef-omni`](providers.en.md#cloudflare-clef).
- **Video**: MP4 (`video/mp4`) or WebM (`video/webm`), on `clef-omni` among the built-in models. Cloudflare shares a 16 MiB decoded budget across audio and video and treats images separately.

Providers preflight attachment format, count, and byte limits. The fallback chain skips models that cannot accept the required attachments. Set `longContext: true` to request the 262k-token extended context on TypeSafe Jev.

Cloudflare's public examples explicitly use MP3=`audio/mpeg` and MP4=`video/mp4`. This package maps WAV and WebM to `audio/wav` and `video/webm`, respectively, but those two MIME values have not been verified against an account schema or live request. Validate WAV or WebM with a small sample before relying on it.

```ts
const result = await ctx.system1.decide({
  state: 'Review this device installation and operation.',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  audio: [{ mediaType: 'audio/mpeg', data: audioBase64 }],
  videos: [{ mediaType: 'video/mp4', data: videoBase64 }],
  questions: {
    label_visible: { type: 'noul', instructions: 'Is the device label legible in the image?' },
    runs_smoothly: { type: 'noul', instructions: 'Does the device run without unusual noise?' },
  },
  model: { provider: 'cloudflare', model: 'clef-omni' },
})
```

The TypeSafe confidence value is preserved as received. Its provider and actual model are identified through `meta.executed`. TypeSafe computes confidence as a deterministic value from 0 to 1 based on its distribution, but the protocol does not fix the formula; see [TypeSafe Confidence](https://docs.typesafe.ai/confidence). Other providers must document their confidence semantics before consumers use thresholds from another provider.

`state` supports JSON. The current TypeSafe state supports strings, objects, and arrays; other JSON scalar values return `unsupported`. Question instructions and criteria descriptions support strings, objects, or arrays; a choice description may also be `null`. Media uses the top-level `images`, `audio`, and `videos` fields. Question and option identifiers must not be empty or equal to `__proto__`, `prototype`, or `constructor`.

Malformed call structures throw `System1InputError`. Runtime failures for a structurally valid request are returned per question with `status: 'error'`. Error codes include `unavailable`, `unsupported`, `limit_exceeded`, `timeout`, `cancelled`, `provider_error`, and `invalid_response`. A missing or invalid answer for one question does not discard other valid answers; unexpected question ids appear in `meta.warnings`.

`meta.requested` records the selected provider id and model. `meta.executed` is present only after a valid backend response. Metadata also includes a request id, duration, and available usage. `approximate` and `degraded` are provider-supplied; an omitted field means unknown. Callers may override `signal` and `timeoutMs` per request. Each attempt receives the full timeout budget, so a fallback chain can take up to its number of models multiplied by that budget. A timeout cannot stop non-cooperative third-party code, so providers should cancel their underlying I/O.

## Fallback models

Add fallback models in order in the plugin settings. The service tries `[defaultModel, ...fallbackModels]` and deduplicates identical provider/model pairs. A per-call `model` override runs by itself and does not read the fallback list. Each fallback entry must contain string `provider` and `model` fields; malformed plugin configuration is rejected during load, and non-empty values are checked when the fallback chain is used. An explicit `model` call is unaffected by unused fallback entries.

The service moves to the next model when a whole attempt fails because the provider is unavailable, times out, lacks a required capability, returns `provider_error`, or returns an invalid response envelope. Invalid answers inside an otherwise valid envelope are returned per question without retrying another model. Caller cancellation, a provider-reported `cancelled` error, unregistering a provider during a call, or service unload ends the chain. The cancelled attempt is omitted from `meta.attempts`.

`meta.requested` is the first model in the chain; `meta.executed` is the provider and actual model that succeeded; `meta.attempts` lists completed failed attempts and their error codes and messages in order, and is omitted when there are no recorded failures. If every model attempt fails, each question returns the last attempt's error; cancellation returns `cancelled`. Probabilities from different models are not calibrated against each other. Consumers that need stable thresholds should inspect `meta.executed`.

## Agent tool

The `dsh-system1/tool` component injects `system1` and the DSH `tools` registry and registers the model-facing `system1_decide` tool. It relies only on the host's tool registry and adds no runtime dependency on `@deepseek-ai/dsh-tools`.

Arguments:

- `state`: the text or JSON value to judge.
- `questions`: an array of questions. Each has an `id` (the unique result key), a `type` (`noul`, `choice`, `score`, or `box`), string `instructions`, and the same optional `criteria` as `decide()`. `choice` requires an object mapping candidate keys to descriptions; `score` requires an array of levels from lowest to highest; `box` requires an image attachment.
- `images`: an optional list of image attachments in the same format as `decide()`.
- `audio`, `videos`: optional audio and video attachment lists in the same format as `decide()`; Liquid AI and Cloudflare `clef-omni` accept audio; choose `clef-omni` for video.
- `longContext`: an optional boolean; when `true`, it requests extended context from TypeSafe Jev.
- `model`: an optional `{ provider, model }`; the service default is used when omitted.

The tool returns `{ answers, model?, fallbacks? }`. `answers` maps each `id` to `{ status: 'ok', answer }` or `{ status: 'error', error: { code, message } }`. When a provider succeeds, `model` identifies the provider and actual model that ran; it is omitted when none succeeds. `fallbacks`, when present, lists non-cancelled failed attempts as `{ provider, model, error: { code, message } }` in order. The tool forwards the call's cancellation signal to `decide()` and uses the selected provider's configured or default timeout. A malformed structure fails the whole tool call; a runtime failure appears only in the affected question's result.

The tool description tells models that probabilities range from 0 to 1, `score.value` is a zero-based expected criteria index, `box` edges are normalized image coordinates, confidence is backend-defined and not comparable across backends, and probabilities from different models are not calibrated against each other.

## Implementing a provider

Each provider declares canonical IDs and optional aliases in its own model array; there is no cross-provider catalog to maintain. `ProviderModel` uses `id` for the canonical model ID and `aliases` for other input names accepted by that provider. Settings use the canonical IDs; aliases do not appear as separate menu options. `findProviderModel(models, input)` resolves a definition by canonical ID or alias. Use the matched `id` for capability checks and upstream requests. Built-in providers validate the model ID first, returning `unsupported` for an unknown model before resolving credentials. Capability limits remain provider-adapter-owned; localized settings labels live in the client locale strings.

Import types from `dsh-system1/contracts`, `System1ProviderError` from the package root, and `findProviderModel` from `dsh-system1/providers` when resolving aliases. Error messages must be safe to display. Implement `describe(model, signal)` and `evaluate(request, signal)` and return standard per-question answers. Treat request parameters as read-only. See the [provider example](../examples/provider.ts).

```ts
import { findProviderModel } from 'dsh-system1/providers'
import type { ProviderModel } from 'dsh-system1/contracts'

const MODELS = [
  { id: 'example-v2', aliases: ['example-latest'] },
] as const satisfies readonly ProviderModel[]

const selected = findProviderModel(MODELS, requestedModel)
// selected?.id is the canonical ID for capability checks and upstream requests
```

```ts
ctx.effect(() => ctx.system1.registerProvider('custom', backend))
```

Provider ids must be unique within a service. Registration returns an idempotent disposer. Unregistering cancels in-flight calls for that instance, and service disposal removes all registrations. `System1Provider` must implement `timeoutMs(): number`. Each attempt uses a request-level value when present; otherwise it calls the provider method, and rejects anything other than a positive integer as `invalid_response`. Providers must declare their count limits: `maxQuestions`, `maxChoiceOptions`, and `maxScoreLevels` are required as a positive integer or explicit `null` (delegate preflight to the upstream). If images are supported, declare `maxCount`, `maxBytesPerImage`, and `maxTotalBytes`; if audio or video is supported, declare `maxCount` and `maxBytesPerItem`. Attachment declarations must stay within shared resource-safety ceilings of 16 items per type, 16 MiB per item, and 64 MiB total. Missing runtime declarations fail the attempt as `invalid_response` and produce one provider-logger warning. Use `audioVideo` for any tighter shared audio/video byte limit. `longContext.maxTokens` declares extended context. Context token counts are informational; the backend enforces its actual token budget. `ProviderRequest` receives the shared media attachments and `longContext` option.

## TypeSafe capabilities and limits

Supported models are `jev-1.13.0`, `jev-1.14.0`, `jev-latest`, and `jev-preview`. The versioned IDs are fixed; TypeSafe can move the `jev-latest` and `jev-preview` aliases over time. `choice` supports up to 255 candidates; `score` supports 2–10 levels. Jev 1.13 and 1.14 have default context limits of 64k tokens per request and 32k tokens for state plus the longest individual question; `longContext: true` opts into a 262k limit. Image input supports PNG/JPEG; `box` is available with Jev 1.14 and the current `jev-preview` alias. The provider sends TypeSafe's experimental request headers when needed. TypeSafe labels image and Box support experimental; the request format, limits, and accuracy may change. The backend enforces exact token limits. HTTP 422 responses remain `provider_error` with `httpStatus`; without a stable error code, the service does not infer that the response means a length limit was exceeded.

The provider plugin accepts `id`, `apiKeyEnv`, and optional `baseURL`; the first two default to `typesafe` and `TYPESAFE_API_KEY`. `createTypesafeProvider` accepts an explicit API key, optional base URL, and fetch implementation for embedding and local fixtures.

## Nace.AI Drex capabilities and limits

`dsh-system1/providers/nace` exports the Cordis plugin, `createNaceProvider`, `NaceOptions`, and `NACE_MODELS` (`drex-v2.0`, `drex-max-v1.1`, `drex-max-finance`). Nace supports `noul`, `choice`, and `score`. The adapter serializes structured descriptions as compact JSON text, preserves `null` choice descriptions, and returns score probabilities in level order.

All three models accept up to 512 questions. Use Max v1.1 or Finance for images; both allow 255 options or levels per question and 262,144 tokens per packed request. The adapter keeps images inline within the 4 MiB JSON request budget and uploads only as many as needed to fit. See [Nace setup](providers.en.md#naceai-drex) for context, image limits, and retention. Requests naming retired IDs return `unsupported` before sending HTTP requests. Token and other request-limit errors from Nace map to `provider_error`.

## meraGPT Decider 1.1 capabilities and limits

`dsh-system1/providers/meragpt` exports the Cordis plugin, `createMeraGptProvider`, `MeraGptOptions`, and `MERAGPT_MODELS`. The adapter resolves `sd-1` and `state-decider-1` to `decider-1` and sends `decider-1.1` as-is when pinned.

Send up to 64 `noul`, `choice`, or `score` questions. The maximums are 255 choice options and 32 score levels. The state plus any one question can use up to 32,768 tokens. Pass images in the shared `images` field; the adapter converts them to `image_url` items inside the upstream state and keeps the original state in a separate field. See [meraGPT setup](providers.en.md#meragpt-decider-11).

## Liquid AI capabilities and limits

`dsh-system1/providers/liquid` exports the Cordis plugin, `createLiquidProvider`, `LiquidOptions`, and `LIQUID_MODELS` (`d1.2`, `d1.2-ultra`). The plugin supports `noul`, `choice`, and `score` on both models, up to 128 questions. The state, shared media, and any one question can use up to 65,536 tokens. The backend enforces option and level counts.

Pass media in `images` and `audio`. The adapter returns `limit_exceeded` if the encoded JSON body reaches 4.5 MB. See [Liquid AI setup](providers.en.md#liquid-ai) for connection and media limits, and [live text, image, and audio results](testing.en.md#liquid-ai-live-probe) for both models.

For example, ask separate questions about a photo and a recording from the same ticket:

```ts
const result = await ctx.system1.decide({
  model: { provider: 'liquid', model: 'd1.2' },
  state: 'The customer reports receiving a damaged package.',
  images: [{ mediaType: 'image/jpeg', data: photoBase64 }],
  audio: [{ mediaType: 'audio/wav', data: clipBase64 }],
  questions: {
    damage: { type: 'noul', instructions: 'Is the package visibly damaged in the photo?' },
    refund: { type: 'noul', instructions: 'Does the caller ask for a refund?' },
  },
})
```

## Cloudflare Clef capabilities and limits

All three Clef models support `noul`, `choice`, and `score`, up to 64 questions with up to 255 options or 10 levels per question. Choose `clef-omni` for audio or video. See [Cloudflare Clef setup](providers.en.md#cloudflare-clef).
