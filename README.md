<div align="center">

# dsh-system1

**Structured decisions and evidence location for DSH agents and plugins.** Use `ctx.system1.decide()` or the `system1_decide` Agent tool to classify, filter, or score. Use [Locate](docs/locate.en.md) to highlight matching text or draw boxes over objects in one image, through `ctx.system1.locate()` or the opt-in `system1_locate` tool. System1 connects TypeSafe Jev, Cloudflare Clef, Nace Drex, meraGPT Decider 1.1, Liquid AI d1.2, self-hosted Laya, and compatible custom providers.

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml) [![npm version](https://img.shields.io/npm/v/dsh-system1)](https://www.npmjs.com/package/dsh-system1) [![License](https://img.shields.io/github/license/exoticknight/dsh-system1)](LICENSE) [![Maintained with RED](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

[![dsh.pub registry status](https://dsh.pub/api/badges/exoticknight/dsh-system1.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-system1) [![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/exoticknight/dsh-system1)
[![dsh-xray](https://img.shields.io/endpoint?url=https%3A%2F%2Funstone.github.io%2Fdsh-xray%2Fbadge%2Fexoticknight__dsh-system1.json)](https://unstone.github.io/dsh-xray/p/exoticknight__dsh-system1.html) [![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/) [![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

English | [简体中文](README.zh-CN.md)

</div>

## Providers and models

Choose a built-in provider or add one that implements the public provider contract. Model options and supported inputs vary by provider and model.

| Provider | Model options | Deployment and notable support |
| --- | --- | --- |
| TypeSafe (`typesafe`) | `jev-latest`, `jev-preview`, `jev-1.14.0`, `jev-1.13.0` | Hosted Jev; PNG/JPEG; `box` requires `jev-1.14.0` or `jev-preview`; optional 262k context. |
| Cloudflare (`cloudflare`) | `clef`, `clef-flash`, `clef-omni` | Workers AI or a compatible local Clef service; PNG/JPEG/WebP; `clef-omni` also accepts audio and video. |
| Nace.AI (`nace`) | `drex-max-v1.2`, `drex-max-finance` | Hosted Drex; both models accept images and up to 262,144 tokens per request. |
| meraGPT (`meragpt`) | `decider-1`, `decider-1.1` | Hosted Decider 1.1; accepts PNG/JPEG/WebP and up to 32,768 tokens for state plus any one question. |
| Liquid AI (`liquid`) | `d1.2`, `d1.2-ultra` | Hosted decision models; accept text, images, and WAV/MP3 audio. |
| Laya (`laya`) | `auto`, `english`, `multilingual`, `typed-decisions` | Self-hosted [Laya server](https://github.com/NandhaKishorM/laya); text only; API key optional. |
| Custom | — | Any backend implementing the public provider contract. |

See [provider setup](docs/providers.en.md) for credentials, endpoints, and limits. Both Liquid models passed [live text, image, and audio checks](docs/testing.en.md#liquid-ai-live-probe).

[System One models](https://systemonemodels.org/guides/what-is-a-system-one-model/) are decision models that return typed answers with probabilities instead of generated text. The name borrows Kahneman's "fast thinking": they handle narrow judgments such as gating, routing, and scoring, while the main LLM writes and reasons.

| Primitive | Result                                                               |
| --------- | -------------------------------------------------------------------- |
| `noul`    | Yes/no: probability that the proposition is true (`probabilityTrue`) |
| `choice`  | Candidate key and the full probability distribution                  |
| `score`   | Expected zero-based level and the probability distribution           |
| `box`     | Normalized image coordinates for a located object (model-dependent)  |

Requests and responses are validated, and each question gets its own result. Calls support cancellation, per-attempt timeouts, and fallback models, and return execution metadata.

## Install from npm

Install the package in a project that uses System One:

```sh
npm install dsh-system1
```

To activate the bundled service and providers in dsh, add the npm package to the profile you run. Replace `<profile>` with your profile name:

```sh
dsh plugin --profile <profile> add dsh-system1
```

The dsh plugin command requires a profile; installing into one profile does not activate the bundle in other profiles. To use the GitHub repository as the package source, replace `dsh-system1` in that command with `github:exoticknight/dsh-system1`.

The bundled patch mounts the service and built-in providers. In **System One** settings, open **Decision** or **Locate** to enable the operation and choose its primary model and ordered fallbacks. Open the provider component from DSH's **Components** list to see that instance's models and edit its endpoint, credentials, or timeout. Saving a disabled operation keeps its settings for next time.

Decision defaults to TypeSafe `jev-latest`; unconfigured Locate starts off. Each attempt uses the request's `timeoutMs` when supplied, then the provider's configured timeout or its own default: 800 ms for TypeSafe, Laya, and Cloudflare; 10,000 ms for meraGPT and Liquid AI; 60,000 ms for Nace. Each fallback gets the full budget, so total request time can grow with the chain length. For connection and credential details, see [provider setup](docs/providers.en.md).

The Web settings page and agent tool have been verified on DSH `0.2.3-alpha.2`. To run that host from npm, use Node.js 24.22.3 or later in the 24.x series, or 26.13.1 or later in the 26.x series. See [DSH runtime requirements](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.3-alpha.2/docs/upgrade-guide/v0.2.3-alpha.1/node-24-22-3/guide.md).

## Update notices

The first load of a new plugin release in DSH Web automatically shows an update summary. Select **Release notes** in the System One plugin settings to read it again. The summary ships with the plugin and works offline; the full release notes link requires a connection.

The current browser stores only the last shown notice ID for the current DSH origin. Refreshing or restarting does not repeat the notice; clearing site data, switching browsers, or downgrading and upgrading again may show it again. If browser storage or cross-tab coordination is unavailable, automatic notices are skipped and manual viewing remains available.

## Agent tool

Once installed, the agent can call the `system1_decide` tool without a consumer plugin. The main model can hand yes/no checks, classification, and scoring to System One and decide the next step from the returned probabilities. The tool uses the default service and model configured above.

The bundled `system1-tool` component is on by default and exposes `system1_decide` while Decision is enabled. To expose `system1_locate`, enable Locate, configure its primary model, and turn on its **Agent tool** switch. That switch leaves plugin calls available. Disable the shared component on the Plugins page, or set `disabled: true` on its entry in a headless profile, to remove the Agent tools without turning off the operations. See the [Decision tool API](docs/api.en.md#agent-tool) and [Locate setup](docs/locate.en.md).

## Use from a consumer plugin

In your consumer plugin project, install the package with the npm command above. Then declare `inject: ['system1']` and import this package's Cordis type augmentation:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from 'dsh-system1'

export const inject = ['system1']

export async function apply(ctx: Context) {
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
        criteria: { billing: 'Billing', technical: 'Technical support' },
      },
      urgency: {
        type: 'score',
        instructions: 'Rate urgency.',
        criteria: ['Normal', 'Urgent', 'Critical'],
      },
    },
  })

  if (result.answers.topic.status === 'ok') {
    return result.answers.topic.answer.value // 'billing' | 'technical'
  }
  return result.answers.topic.error
}
```

`noul` returns `probabilityTrue`; `choice` returns a candidate key and its full distribution; `score` returns an expected level and probabilities ordered by `criteria`; `box` returns normalized image edges. These are model outputs, so consumer plugins choose their own decision thresholds and actions. Runtime failures are reported per question with `status: 'error'`; malformed call structures throw `System1InputError`.

See [API and provider development](docs/api.en.md) for the full contract and [the consumer example](examples/consumer.ts). TypeSafe supports `jev-latest`, `jev-preview`, `jev-1.14.0`, and `jev-1.13.0`; see [provider setup](docs/providers.en.md) for other services and their limits.

## Development

Use the Node.js and pnpm versions declared in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm test` runs the plugin and provider tests with local fixtures, as CI does; `pnpm test <plugin|providers|provider name>` runs a subset. Live model probes, `pnpm probe <typesafe|nace|meragpt|liquid|cloudflare|laya|clef-local>`, read credentials from `.env.local`, and local targets set up their own service on first use; hosted probes send real requests and can use account quota or prepaid credit. See [testing and live model validation](docs/testing.en.md).

See the [contribution guide](CONTRIBUTING.md) and [release process](docs/releasing.en.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
