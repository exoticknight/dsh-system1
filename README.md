<div align="center">

# dsh-system1

**Ask System One models for yes/no, choice, score, and image-box judgments with probabilities.** The agent can call the built-in `system1_decide` tool, and plugins can call `ctx.system1.decide()`. Results come back per question instead of as generated text; the caller decides what to do next.

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml) [![npm version](https://img.shields.io/npm/v/dsh-system1)](https://www.npmjs.com/package/dsh-system1) [![License](https://img.shields.io/github/license/exoticknight/dsh-system1)](LICENSE) [![Maintained with RED](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

[![dsh.pub registry status](https://dsh.pub/api/badges/exoticknight/dsh-system1.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-system1) [![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/exoticknight/dsh-system1)
[![dsh-xray](https://img.shields.io/endpoint?url=https%3A%2F%2Funstone.github.io%2Fdsh-xray%2Fbadge%2Fexoticknight__dsh-system1.json)](https://unstone.github.io/dsh-xray/p/exoticknight__dsh-system1.html) [![DSH Market](https://raw.githubusercontent.com/2BingLing/dsh-market/master/assets/readme/badge-listed-en.svg)](https://dsh.market/) [![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

English | [简体中文](README.zh-CN.md)

</div>

[System One models](https://systemonemodels.org/guides/what-is-a-system-one-model/) are decision models that return typed answers with probabilities instead of generated text. The name borrows Kahneman's "fast thinking": they handle narrow judgments such as gating, routing, and scoring, while the main LLM writes and reasons.

| Primitive | Result                                                               |
| --------- | -------------------------------------------------------------------- |
| `noul`    | Yes/no: probability that the proposition is true (`probabilityTrue`) |
| `choice`  | Candidate key and the full probability distribution                  |
| `score`   | Expected zero-based level and the probability distribution           |
| `box`     | Normalized image coordinates for a located object (model-dependent)  |

Requests and responses are validated, and each question gets its own result. Calls support cancellation, per-attempt timeouts, and fallback models, and return execution metadata.

Built-in providers:

- **TypeSafe** (`typesafe`): hosted Jev models with PNG/JPEG input and optional 262k context; `box` requires `jev-1.14.0` or `jev-preview`.
- **Laya** (`laya`): a self-hosted [Laya server](https://github.com/NandhaKishorM/laya); API key optional; text only.
- **Cloudflare** (`cloudflare`): `clef`, `clef-flash`, `clef-omni` with PNG/JPEG/WebP input; can also point at a local Clef service.

Other backends can implement the public provider contract.

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

The bundled patch mounts the service and built-in providers. Defaults are model `jev-latest`, provider id `typesafe`, and an 800 ms timeout per model attempt. Use the plugin settings to choose a default service and model, add fallback models in the order they should be tried, configure connections, and store keys in DSH credentials; environment variables are also supported. Each fallback gets the full timeout budget, so total request time can grow with the chain length. Adjust `timeoutMs` to fit backend latency, especially for local CPU inference.

Cloudflare uses provider `cloudflare` with `clef`, `clef-flash`, or `clef-omni`. See [provider setup](docs/providers.en.md) for configuration.

## Update notices

The first load of a new plugin release in DSH Web automatically shows an update summary. Select **Release notes** in the System One plugin settings to read it again. The summary ships with the plugin and works offline; the full release notes link requires a connection.

The current browser stores only the last shown notice ID for the current DSH origin. Refreshing or restarting does not repeat the notice; clearing site data, switching browsers, or downgrading and upgrading again may show it again. If browser storage or cross-tab coordination is unavailable, automatic notices are skipped and manual viewing remains available.

## Agent tool

Once installed, the agent can call the `system1_decide` tool without a consumer plugin. The main model can hand yes/no checks, classification, and scoring to System One and decide the next step from the returned probabilities. The tool uses the default service and model configured above.

The bundle's `system1-tool` component provides the tool and is enabled by default. Turn the component off on the Plugins page to remove the tool, or set `disabled: true` on its entry in a headless profile. See [the API reference](docs/api.en.md#agent-tool) for arguments and results.

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

`pnpm test` runs the plugin and provider tests with local fixtures, as CI does; `pnpm test <plugin|providers|provider name>` runs a subset. Live model probes, `pnpm probe <typesafe|cloudflare|laya|clef-local>`, read credentials from `.env.local`, and local targets set up their own service on first use; see [testing and live model validation](docs/testing.en.md).

See the [contribution guide](CONTRIBUTING.md) and [release process](docs/releasing.en.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
