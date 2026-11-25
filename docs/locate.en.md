# Locate evidence in text or an image

[简体中文](locate.md) | [English](locate.en.md)

Use Locate to find the passages that name payment terms, or mark every matching object in a picture. Send one instruction and one source. The result points into the original material so you can highlight it or draw boxes over it.

## Configure a route

In **System One** plugin settings, select **Locate** under **Operations**. Turn on **Enable Locate**, choose a primary model, and add any fallback models in order. Check the separate Text and Image route previews, then select **Save settings**. To set a key, endpoint, or timeout, open the provider component from DSH's **Components** list.

| Provider and model | Input |
| --- | --- |
| Nace `drex-max-locate` | Text |
| Nace `drex-max-box` | Image |
| Liquid AI `d1.2`, `d1.2-ultra` | Text and image |

For example, make Nace `drex-max-locate` the primary model and Liquid `d1.2` the fallback. Text tries Nace first; images go straight to Liquid. Set up the [provider connections](providers.en.md) before calling them. A fallback can send the same source to another provider; only configure providers allowed to receive it.

An unconfigured Locate operation starts off. Turning off **Enable Locate** and saving blocks new plugin and Agent calls while keeping the route and tool preference editable. Calls already running continue. Turn Locate back on to reuse the saved configuration. An explicit model can replace the route for a plugin call, but Locate must still be on.

The **Agent tool** switch only controls whether to expose `system1_locate`. To publish it, keep the bundled `system1-tool` component active, set a valid primary model, and enable the Agent tool. Leaving it off lets plugins call Locate without exposing the tool to agents.

In a headless profile, the equivalent service configuration is:

```yaml
operations:
  locate:
    version: 1
    enabled: true
    defaultModel: { provider: nace, model: drex-max-locate }
    fallbackModels:
      - { provider: liquid, model: d1.2 }
    agentEnabled: true
```

To pause Locate in a headless profile, set `operations.locate.enabled: false` and keep the other fields. Decision has its own switch at `operations.decide.enabled`; its model route stays in the service's top-level `defaultModel` and `fallbackModels`.

## Highlight exact text

```ts
import { toUtf16Range } from 'dsh-system1'

const source = '（到期日😀）六月二十日；服务截止日：六月二十日。'
const result = await ctx.system1.locate({
  source: { type: 'text', text: source },
  instructions: 'Find the two date mentions, including the repeated one.',
})
if (result.status === 'ok') {
  for (const { start, end } of result.matches) {
    const range = toUtf16Range(source, start, end)
    console.log(range, source.slice(...range))
  }
}
```

Each match has `text`, `start` and `end`. The offsets are zero-based Unicode code points; the end is excluded. For example, in `甲😀乙`, the public range for `乙` is `[2, 3)` and the JavaScript UTF-16 range is `[3, 4)`. Use the exact original string, including whitespace. The returned text must equal the original text at the returned offsets.

## Draw boxes over one image

Pass `source: { type: 'image', image: { mediaType, data } }` instead of text. Use a PNG, JPEG or WebP with standard padded Base64 and no data URL prefix. Each match contains `left`, `top`, `right` and `bottom` from 0 to 1, measured from the top-left of the image. Multiply the horizontal edges by the displayed image width and the vertical edges by the displayed height. Align the overlay to the displayed image itself if the view adds padding or letterboxes it.

For a worked plugin example for both source types, see [locate consumer](../examples/locate.ts). A `box` question in `decide()` still returns a single box within a group of decisions; use Locate for zero or more matches.

## Handle empty, incomplete and failed results

- `status: 'ok'` includes `matches` (possibly empty) and `meta.executed`, which identifies the provider and model that answered. An empty array ends routing. An upstream response missing the match list is an error, not an empty match.
- `matchScore` is Nace's match strength; `presenceProbability` is Liquid's estimated presence; `locationConfidence` is Liquid's confidence in the box geometry. Values range from 0 to 1; a missing value is unknown. Use thresholds validated for that model and source.
- `mayHaveMore: true` means the backend reported that it reached a result limit. `false` means it did not report truncation; an omitted value means unknown. For redaction or other tasks that require complete coverage, verify the source independently.
- `status: 'error'` has `error`, `reason` and `meta.attempts`, without `matches`. The reason distinguishes `no_applicable_model`, `upstream_execution_failed`, and `cancelled`; attempts tell you which candidates were skipped or executed. Use the reason and error code to choose whether to fix the route or retry. Malformed input throws `System1InputError`; calling Locate while it is off throws `System1OperationDisabledError`.

`locate(input, { model, signal, timeoutMs })` accepts optional execution options. An explicit `model` tries just that provider and model. Each candidate gets a separate timeout: the call override, then its provider setting, then its provider default. An incompatible candidate is skipped; failures such as timeouts or malformed upstream results can continue along the configured route. Cancellation stops the chain. A Nace `403` also stops the chain as soon as the status arrives: it may indicate Zero retention or missing inference permission. The Agent tool accepts the same `source` and `instructions` as the plugin API and uses the saved Locate route.
