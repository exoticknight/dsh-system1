# API and provider development

[简体中文](api.md) | [English](api.en.md)

## Requests and results

`decide({ state, questions, model?, signal?, timeoutMs? })` accepts a named set of questions. `model` has the shape `{ provider, model }`; when omitted, the service tries its `defaultModel` and `fallbackModels` in order. If no model is available, the call throws `System1InputError`. `timeoutMs` is a positive integer in milliseconds and defaults to 800. Each model attempt gets the full budget, including capability checks and the backend call.

Public entry points: the package root exports the service, error classes, and types; `dsh-system1/contracts` exports types only. The `dsh-system1/providers/typesafe`, `dsh-system1/providers/laya`, and `dsh-system1/providers/cloudflare` entry points export their plugins and the `createTypesafeProvider`, `createLayaProvider`, and `createCloudflareProvider` factories respectively. See [provider setup](providers.en.md) for connection details and model selection.

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

`noul` returns `probabilityTrue`; `choice` returns the candidate key and full `probabilities`; `score` returns an expected zero-based level and a distribution ordered by `criteria`. Probabilities are model outputs, so consumers choose their own action thresholds.

The TypeSafe confidence value is preserved as received. Its provider and actual model are identified through `meta.executed`. TypeSafe computes confidence as a deterministic value from 0 to 1 based on its distribution, but the protocol does not fix the formula; see [TypeSafe Confidence](https://docs.typesafe.ai/confidence). Other providers must document their confidence semantics before consumers use thresholds from another provider.

Public inputs support JSON. The current TypeSafe state supports strings, objects, and arrays; other JSON scalar values return `unsupported`. Question instructions and criteria descriptions support strings, objects, or arrays; a choice description may also be `null`. Question and option identifiers must not be empty or equal to `__proto__`, `prototype`, or `constructor`.

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
- `questions`: an array of questions. Each has an `id` (the unique result key), a `type` (`noul`, `choice`, or `score`), string `instructions`, and the same optional `criteria` as `decide()`. `choice` requires an object mapping candidate keys to descriptions; `score` requires an array of levels from lowest to highest.
- `model`: an optional `{ provider, model }`; the service default is used when omitted.

The tool returns `{ answers, model?, fallbacks? }`. `answers` maps each `id` to `{ status: 'ok', answer }` or `{ status: 'error', error: { code, message } }`. When a provider succeeds, `model` identifies the provider and actual model that ran; it is omitted when none succeeds. `fallbacks`, when present, lists non-cancelled failed attempts as `{ provider, model, error: { code, message } }` in order. The tool forwards the call's cancellation signal to `decide()` and uses the service timeout. A malformed structure fails the whole tool call; a runtime failure appears only in the affected question's result.

The tool description tells models that probabilities range from 0 to 1, `score.value` is a zero-based expected criteria index, confidence is backend-defined and not comparable across backends, and probabilities from different models are not calibrated against each other.

## Implementing a provider

Import types from `dsh-system1/contracts` and `System1ProviderError` from the package root. Error messages must be safe to display. Implement `describe(model, signal)` and `evaluate(request, signal)` and return standard per-question answers. Treat request parameters as read-only. See the [provider example](../examples/provider.ts).

```ts
ctx.effect(() => ctx.system1.registerProvider('custom', backend))
```

Provider ids must be unique within a service. Registration returns an idempotent disposer. Unregistering cancels in-flight calls for that instance, and service disposal removes all registrations. Declare known capability limits per model and omit unknown limits. Context token counts are informational; the backend enforces its actual token budget.

## TypeSafe capabilities and limits

Supported models are `jev-1.13.0`, `jev-latest`, and `jev-preview`. `choice` supports up to 255 candidates; `score` supports 2–10 levels. The fixed model reports context information of 64k tokens per request and 32k tokens for state plus the longest individual question. The backend enforces exact token limits. HTTP 422 responses remain `provider_error` with `httpStatus`; without a stable error code, the service does not infer that the response means a length limit was exceeded.

The provider plugin accepts `id`, `apiKeyEnv`, and optional `baseURL`; the first two default to `typesafe` and `TYPESAFE_API_KEY`. `createTypesafeProvider` accepts an explicit API key, optional base URL, and fetch implementation for embedding and local fixtures.
