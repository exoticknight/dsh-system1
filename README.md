<div align="center">

# dsh-system1

**A typed System One decision service for DeepSeek Harness plugins.** Consumer plugins call `ctx.system1.decide()`, interpret the results, and choose their own actions.

[![CI](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml/badge.svg)](https://github.com/exoticknight/dsh-system1/actions/workflows/check.yml) [![npm version](https://img.shields.io/npm/v/dsh-system1)](https://www.npmjs.com/package/dsh-system1) [![License](https://img.shields.io/github/license/exoticknight/dsh-system1)](LICENSE) ![DSH](https://img.shields.io/badge/DSH-0.1.5--rc.2-blue) [![Maintained with RED](https://img.shields.io/badge/maintained_with-RED-C1121F)](https://github.com/exoticknight/red)

[![dsh.pub registry status](https://dsh.pub/api/badges/exoticknight/dsh-system1.svg)](https://dsh.pub/en/plugins/?q=exoticknight%2Fdsh-system1)

English | [简体中文](README.zh-CN.md)

</div>

| Primitive | Result                                                     |
| --------- | ---------------------------------------------------------- |
| `noul`    | Probability that a proposition is true (`probabilityTrue`) |
| `choice`  | Candidate key and the full probability distribution        |
| `score`   | Expected zero-based level and the probability distribution |

The service provides request and response validation, per-question results, cancellation, timeouts, provider registration, and execution metadata. The built-in TypeSafe/Jev provider uses TanStack's TypeSafe adapter. Other providers can implement the public provider contract.

## Install from GitHub

Requirements: Node.js 22.19+ in the 22.x line or Node.js 24, Cordis `@deepseek-ai/cordis` 4.x, and dsh `0.1.5-rc.2` or compatible.

Add the public GitHub repository to a dsh profile:

```sh
dsh plugin --profile headless add github:exoticknight/dsh-system1
```

The repository includes the compiled `lib/` files required by the plugin, so installation does not need a local checkout or a manually constructed archive path. pnpm supports GitHub repositories as direct package sources; see [supported package sources](https://pnpm.io/package-sources).

The bundled patch mounts the service and TypeSafe provider. Defaults are model `jev-1.13.0`, provider id `typesafe`, and an 800 ms total timeout. Set `TYPESAFE_API_KEY` in the dsh process environment before startup. Adjust `timeoutMs` to fit the backend latency.

## Use from a consumer plugin

Install the package in your consumer plugin project:

```sh
pnpm add dsh-system1
```

Declare `inject: ['system1']` and import this package's Cordis type augmentation:

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

`noul` returns `probabilityTrue`; `choice` returns a candidate key and its full distribution; `score` returns an expected level and probabilities ordered by `criteria`. These are model outputs, so consumer plugins choose their own decision thresholds and actions. Runtime failures are reported per question with `status: 'error'`; malformed call structures throw `System1InputError`.

See [API and provider development](docs/api.en.md) for the full contract and [the consumer example](examples/consumer.ts). Supported TypeSafe models are `jev-1.13.0` and `jev-latest`.

## Development

Use Node.js 22.19+ in the 22.x line or Node.js 24 and the pnpm version declared in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm verify
```

For an explicit live request, set `TYPESAFE_API_KEY` in `.env.local`, then run `pnpm probe:live`. The probe reads `.env.local`; the dsh plugin reads the process environment. Regular CI uses local fixtures.

See the [contribution guide](CONTRIBUTING.md) and [release process](docs/releasing.en.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
