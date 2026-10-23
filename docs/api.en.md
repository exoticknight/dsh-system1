# API and provider development

[简体中文](api.md) | [English](api.en.md)

## Requests and results

`decide({ state, questions, images?, audio?, videos?, longContext?, model?, signal?, timeoutMs? })` accepts a named set of questions. `model` has the shape `{ provider, model }`; when omitted, the service tries its `defaultModel` and `fallbackModels` in order. If no model is available, the call throws `System1InputError`. `timeoutMs` is a positive integer in milliseconds. Its precedence is per-call value, explicitly configured service value, provider default, then the legacy 800 ms fallback. Nace uses a 60,000 ms provider default; the other built-in providers use 800 ms. Each model attempt gets the full budget, including capability checks and the backend call.

Public entry points: the package root exports the service, error classes, and types; `dsh-system1/contracts` exports types, including `ProviderModel`; `dsh-system1/providers` exports `findProviderModel`. The `dsh-system1/providers/typesafe`, `dsh-system1/providers/laya`, `dsh-system1/providers/nace`, and `dsh-system1/providers/cloudflare` entry points each export their provider plugin, a `create…Provider` factory, and that provider's model array (`TYPESAFE_MODELS`, `LAYA_MODELS`, `NACE_MODELS`, or `CLOUDFLARE_MODELS`). See [provider setup](providers.en.md) for connection details and model selection.

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

`images`, `audio`, and `videos` are optional request-wide attachment lists. Each item is `{ mediaType, data }`, where `data` is standard padded Base64 without a data-URL prefix. Images allow up to eight `image/png`, `image/jpeg`, or `image/webp` files; every question can use them, and a `box` question requires at least one image. Providers check format, count, and size against model capabilities: Nace accepts images only on `drex-max` (up to eight), while TypeSafe and Cloudflare have lower per-model limits. Audio supports `audio/wav` and `audio/mpeg`; video supports `video/mp4` and `video/webm`. Only Cloudflare `clef-omni` currently accepts audio and video: up to four audio clips (8 MiB and 300 seconds each) and two videos (16 MiB and 60 seconds each). Decoded audio and video share a 16 MiB limit; the image budget is separate. Cloudflare validates durations and samples video at 2 fps. Providers preflight format, count, and byte limits against model capabilities, and fallback chains skip models that cannot accept the requested attachments. Set `longContext: true` to request extended context. TypeSafe Jev currently supports up to 262k tokens; requests without this option use standard context limits.

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
- `audio`, `videos`: optional audio and video attachment lists in the same format as `decide()`; currently supported only by Cloudflare `clef-omni`.
- `longContext`: an optional boolean; when `true`, it requests extended context from TypeSafe Jev.
- `model`: an optional `{ provider, model }`; the service default is used when omitted.

The tool returns `{ answers, model?, fallbacks? }`. `answers` maps each `id` to `{ status: 'ok', answer }` or `{ status: 'error', error: { code, message } }`. When a provider succeeds, `model` identifies the provider and actual model that ran; it is omitted when none succeeds. `fallbacks`, when present, lists non-cancelled failed attempts as `{ provider, model, error: { code, message } }` in order. The tool forwards the call's cancellation signal to `decide()` and uses the service timeout. A malformed structure fails the whole tool call; a runtime failure appears only in the affected question's result.

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

Provider ids must be unique within a service. Registration returns an idempotent disposer. Unregistering cancels in-flight calls for that instance, and service disposal removes all registrations. Declare known capability limits per model and omit unknown limits; image, audio, and video formats, counts, and byte limits use the `images`, `audio`, `videos`, and `audioVideo` capabilities, while `longContext.maxTokens` declares extended context. Context token counts are informational; the backend enforces its actual token budget. `ProviderRequest` receives the shared media attachments and `longContext` option.

## TypeSafe capabilities and limits

Supported models are `jev-1.13.0`, `jev-1.14.0`, `jev-latest`, and `jev-preview`. The versioned IDs are fixed; TypeSafe can move the `jev-latest` and `jev-preview` aliases over time. `choice` supports up to 255 candidates; `score` supports 2–10 levels. Jev 1.13 and 1.14 have default context limits of 64k tokens per request and 32k tokens for state plus the longest individual question; `longContext: true` opts into a 262k limit. Image input supports PNG/JPEG; `box` is available with Jev 1.14 and the current `jev-preview` alias. The provider sends TypeSafe's experimental request headers when needed. TypeSafe labels image and Box support experimental; the request format, limits, and accuracy may change. The backend enforces exact token limits. HTTP 422 responses remain `provider_error` with `httpStatus`; without a stable error code, the service does not infer that the response means a length limit was exceeded.

The provider plugin accepts `id`, `apiKeyEnv`, and optional `baseURL`; the first two default to `typesafe` and `TYPESAFE_API_KEY`. `createTypesafeProvider` accepts an explicit API key, optional base URL, and fetch implementation for embedding and local fixtures.

## Nace.AI Drex capabilities and limits

The `dsh-system1/providers/nace` entry exports the Cordis plugin, `createNaceProvider`, `NaceOptions`, and the `NACE_MODELS` array (`drex-v2.0`, `drex-v1.5`, `drex-max`). Nace accepts `noul`, `choice`, and `score`; it does not support `box`. Structured DSH descriptions are serialized as compact JSON text for Nace, and `choice` criteria set to `null` remain `null`. Score levels and returned probabilities retain their array order.

`drex-v1.5` and `drex-v2.0` accept up to 512 questions and no images; `drex-max` accepts up to 16 questions and up to eight PNG/JPEG/WebP images (16 MiB per image, 32 MiB total, and 40 megapixels per image). Max permits 255 choice options or score levels per question. Model token limits are provider capability metadata; DSH does not tokenize Drex input, so Nace enforces them. The UTF-8 request body limit is 4 MiB over `state`, `questions`, and a non-empty `images` array, excluding top-level `model`. Max image payloads remain inline while the request fits; larger requests upload only enough images to account-level files. Nace errors for token or other request limits are returned safely as provider errors. See [Nace provider setup](providers.en.md#naceai-drex) for model token limits, upload behavior, and retention.
