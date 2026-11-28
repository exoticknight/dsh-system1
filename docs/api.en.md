# API and provider development

[简体中文](api.md) | [English](api.en.md)

## Requests and results

`decide({ state, questions, images?, audio?, videos?, longContext?, model?, signal?, timeoutMs? })` accepts a named set of questions. `model` has the shape `{ provider, model }`; when omitted, the service tries its `defaultModel` and `fallbackModels` in order. If no model is available, the call throws `System1InputError`. `timeoutMs` is a positive integer in milliseconds. Its precedence is the per-call value, the selected provider's `timeoutMs` setting, then that provider's own default. TypeSafe, Laya, and Cloudflare default to 800 ms; meraGPT and Liquid AI default to 10,000 ms, and Nace to 60,000 ms. Each model attempt gets the full budget, including capability checks and the backend call.

Move any legacy service-level `timeoutMs` to the corresponding provider settings. If you maintain a third-party provider, see [upgrading provider plugins](#upgrading-provider-plugins). For text passages or multiple boxes in one image, use [Locate](locate.en.md).

The package root exports the service, error classes, and types. `dsh-system1/contracts` exports the public types, including `ProviderModel`; `dsh-system1/providers` exports `findProviderModel`. Each `dsh-system1/providers/<id>` subpath exports the Cordis plugin, a `create…Provider` factory, and its model catalog. Use `typesafe`, `laya`, `nace`, `meragpt`, `liquid`, or `cloudflare` for `<id>`. See [provider setup](providers.en.md) for connection details and model selection.

You can also explicitly load the optional [Chinese Decision local provider](providers.en.md#chinese-decision-08b-opt-in-local-provider).

Consumer plugins declare `inject: ['system1']`. See the [consumer example](../examples/consumer.ts).

### Enable an operation

Decision, Locate, and installed extension operations each have a tab in **System One** settings. The enable switch controls new calls to that operation, including calls with an explicit model. Changing it keeps the saved route, provider connections, and Agent tool preference. Requests already running continue. A disabled call rejects with `System1OperationDisabledError` carrying `operationId` before reaching a provider.

In a headless profile, set `operations.<id>.enabled` on the service. When omitted, Decision is enabled and a newer operation stays enabled if it already has a primary model, fallbacks, or Agent tool enabled. An unconfigured newer operation starts off. Decision's route remains at the top level; for example, `operations.decide.enabled: false` pauses Decision without moving `defaultModel` or `fallbackModels`.

### Call Decision

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

The `dsh-system1/tool` component injects `system1` and the DSH `tools` registry and exposes the model-facing `system1_decide` tool while Decision is enabled. It relies only on the host's tool registry and adds no runtime dependency on `@deepseek-ai/dsh-tools`.

Arguments:

- `state`: the text or JSON value to judge.
- `questions`: an array of questions. Each has an `id` (the unique result key), a `type` (`noul`, `choice`, `score`, or `box`), string `instructions`, and the same optional `criteria` as `decide()`. `choice` requires an object mapping candidate keys to descriptions; `score` requires an array of levels from lowest to highest; `box` requires an image attachment.
- `images`: an optional list of image attachments in the same format as `decide()`.
- `audio`, `videos`: optional audio and video attachment lists in the same format as `decide()`; Liquid AI and Cloudflare `clef-omni` accept audio; choose `clef-omni` for video.
- `longContext`: an optional boolean; when `true`, it requests extended context from TypeSafe Jev.
- `model`: an optional `{ provider, model }`; the service default is used when omitted.

The tool returns `{ answers, model?, fallbacks? }`. `answers` maps each `id` to `{ status: 'ok', answer }` or `{ status: 'error', error: { code, message } }`. When a provider succeeds, `model` identifies the provider and actual model that ran; it is omitted when none succeeds. `fallbacks`, when present, lists non-cancelled failed attempts as `{ provider, model, error: { code, message } }` in order. The tool forwards the call's cancellation signal to `decide()` and uses the selected provider's configured or default timeout. A malformed structure fails the whole tool call; a runtime failure appears only in the affected question's result.

For Locate and extension operations with a tool, `agentEnabled` controls publication to agents separately from execution. While the operation is enabled, a plugin can use the API even when `agentEnabled` is off. Publishing also requires an available primary model and the mounted tool component. See [Locate](locate.en.md).

The Decision tool description tells models that probabilities range from 0 to 1, `score.value` is a zero-based expected criteria index, `box` edges are normalized image coordinates, confidence is backend-defined and not comparable across backends, and probabilities from different models are not calibrated against each other.

## Implementing a provider

A provider plugs into an operation, not into every System1 feature. Import the corresponding operation definition from `dsh-system1` and register an implementation in the provider plugin scope:

```ts
import { decideOperation } from 'dsh-system1'
import { createCloudflareProvider } from 'dsh-system1/providers/cloudflare'

const backend = createCloudflareProvider({ accountId, apiKey })
ctx.effect(() => ctx.system1.registerImplementation(decideOperation, 'cloudflare', backend))
```

For a custom implementation, declare the operation's major `version`, the model selection method, `timeoutMs()`, and `execute(input, { model, requestId, signal })`. Return `{ model, result, revision? }` using the actual model that answered. Treat input as read-only and forward the signal to upstream I/O. The operation definition owns input and output validation; the implementation owns its upstream protocol and limits. Keep provider errors safe to display. For new operations, pass `'fallback'` to `System1ProviderError` only when sending the source to the next configured provider is acceptable. Use `'stop'` for policy refusals. Decision retains its existing error routing.

- A fixed catalog uses `models: { kind: 'fixed', models: [...] }`. Each entry declares canonical `id`, optional `aliases`, supported `inputs`, and operation-specific `capabilities`. Menus show canonical IDs.
- A deployment catalog uses `models: { kind: 'deployment', inputs, resolve(model, signal) }`. Settings accept a deployment name. Resolve it to the same model descriptor without sending task input, and use the selected model within the shared attempt timeout.
- If a connection setting switches the catalog, add a synchronous `resolveDeployment()`. Return immutable `models` and an `execute` function bound to the same endpoint snapshot. Use a different catalog object when the catalog changes.

For Decision, implement `DecideImplementation`: the result carries standard per-question `answers` and may include `usage`, `approximate`, and `degraded`. Use `ModelCapabilities` to declare question limits (`maxQuestions`, `maxChoiceOptions`, `maxScoreLevels`); a positive integer enables local checks, or `null` delegates to the backend. Declare count and byte limits for supported media. The shared ceilings remain 16 items per type, 16 MiB per item, and 64 MiB decoded in total. `audioVideo` can tighten the combined audio and video limit; `longContext.maxTokens` declares extended context. Token counts are informational; the backend enforces its tokenizer budget. See the [custom provider example](../examples/provider.ts).

An operation ID must be unique; an implementation is unique for its operation and provider ID. Registration returns an idempotent disposer. Use it with `ctx.effect` so unload removes the catalog entry and cancels its in-flight calls. A provider can register Decision and Locate under the same ID while sharing its connection and credentials.

### Add a distinct operation

Define it with `defineOperation`, then register the definition and its implementation in that order. The runtime catalog adds an operation tab and its optional Agent tool. Enable the operation on its tab or at `operations.<id>.enabled`, and pin its major `version` when saving a route. Consumers call `service.run(operation, input, { model, signal, timeoutMs })`. The result is `{ status: 'ok', value, meta }` or `{ status: 'error', reason, error, meta }`. See the [standalone operation example](../examples/operation.ts).

## Upgrading provider plugins

Applications that call `decide()` or `system1_decide` keep their request and result contracts. The six bundled providers use the new registration interface; their connection settings and credentials stay where they were. Opening the settings page does not require migrating the existing Decision route.

Third-party providers using `registerProvider(id, backend)` must be upgraded alongside the service:

1. Import `decideOperation` (or the definition of another operation your provider implements). Replace `System1Provider` with `DecideImplementation` for Decision.
2. Declare a fixed model catalog or a deployment resolver, and include each model's capabilities. Move the execution logic from `evaluate` to `execute`; take the chosen model, request ID and signal from the second argument, and put the old answer fields inside `result`.
3. Register with `ctx.effect(() => ctx.system1.registerImplementation(decideOperation, id, implementation))`. Keep the existing provider ID, model names, connection settings and credential references so saved routes still resolve.

The old registration method was removed. If a third-party provider has no compatible build, keep the earlier service and provider together. An unregistered candidate is skipped, so check whether a saved fallback sends the request to another provider. To roll back, restore matching service and provider versions and the pre-upgrade configuration snapshot; turning off Locate does not restore the old API.

## TypeSafe capabilities and limits

Supported models are `jev-1.13.0`, `jev-1.14.0`, `jev-latest`, and `jev-preview`. The versioned IDs are fixed; TypeSafe can move the `jev-latest` and `jev-preview` aliases over time. `choice` supports up to 255 candidates; `score` supports 2–10 levels. Jev 1.13 and 1.14 have default context limits of 64k tokens per request and 32k tokens for state plus the longest individual question; `longContext: true` opts into a 262k limit. Image input supports PNG/JPEG; `box` is available with Jev 1.14 and the current `jev-preview` alias. The provider sends TypeSafe's experimental request headers when needed. TypeSafe labels image and Box support experimental; the request format, limits, and accuracy may change. The backend enforces exact token limits. HTTP 422 responses remain `provider_error` with `httpStatus`; without a stable error code, the service does not infer that the response means a length limit was exceeded.

The provider plugin accepts `id`, `apiKeyEnv`, and optional `baseURL`; the first two default to `typesafe` and `TYPESAFE_API_KEY`. `createTypesafeProvider` accepts an explicit API key, optional base URL, and fetch implementation for embedding and local fixtures.

## Nace.AI Drex capabilities and limits

`dsh-system1/providers/nace` exports the Cordis plugin, `createNaceProvider`, `NaceOptions`, `createNaceLocateProvider`, and the hosted Decision catalog `NACE_MODELS` (`drex-max-v1.2`, `drex-max-finance`). Nace supports `noul`, `choice`, and `score`. The adapter serializes structured descriptions as compact JSON text, preserves `null` choice descriptions, and returns score probabilities in level order.

Both models at the official endpoint support images, up to 512 questions, 255 options or levels per question, and 262,144 tokens per packed request. The old IDs `drex-v2.0` and `drex-max-v1.1` resolve to `drex-max-v1.2`; a route sends at most one upstream request through those equivalent IDs on the same provider instance. A failure before dispatch does not count. `meta.requested` records the original requested model; `meta.executed` uses the model in the response. Custom endpoints retain their previous catalog, IDs, and capabilities; see [Nace setup](providers.en.md#naceai-drex).

The adapter keeps images inline within the 4 MiB JSON budget and uploads only as many as needed to fit. Unknown IDs return `unsupported` before HTTP I/O. Token and other request-limit errors from Nace map to `provider_error`.

## meraGPT Decider 1.1 capabilities and limits

`dsh-system1/providers/meragpt` exports the Cordis plugin, `createMeraGptProvider`, `MeraGptOptions`, and `MERAGPT_MODELS`. The adapter resolves `sd-1` and `state-decider-1` to `decider-1` and sends `decider-1.1` as-is when pinned.

Send up to 64 `noul`, `choice`, or `score` questions. The maximums are 255 choice options and 32 score levels. The state plus any one question can use up to 32,768 tokens. Pass images in the shared `images` field; the adapter converts them to `image_url` items inside the upstream state and keeps the original state in a separate field. See [meraGPT setup](providers.en.md#meragpt-decider-11).

## Liquid AI capabilities and limits

`dsh-system1/providers/liquid` exports the Cordis plugin, `createLiquidProvider`, `LiquidOptions`, `createLiquidLocateProvider`, and `LIQUID_MODELS` (`d1.2`, `d1.2-ultra`). The plugin supports `noul`, `choice`, and `score` on both models, up to 128 questions. The state, shared media, and any one question can use up to 65,536 tokens. The backend enforces option and level counts.

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
