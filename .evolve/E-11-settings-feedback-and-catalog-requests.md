+++
id = "E-11"
state = "evolve"
status = "open"
title = "Settings feedback and catalog requests"
created = "2026-10-22"
+++

# E-11: Settings feedback and catalog requests

## Change

- Add feedback and catalog-request links below the bundle settings form, where users choose the default and fallback provider/model: report a problem, request a provider, or request a model. Open each matching GitHub issue form in a new tab.
- Add a problem-report link below each provider's connection settings.
- Add separate bilingual GitHub issue forms for bugs, provider requests, and model requests. Keep the prompts focused on reproducible details, official API/model documentation, System One decision support, and use case; disable unstructured blank issues.

## Rationale

Put requests beside model selection and configuration, where the missing or broken capability becomes apparent. Separate forms collect the evidence maintainers need to distinguish integration scope from model availability. Bilingual prompts keep the project accessible to both Chinese and English users.

## Acceptance

- Bundle settings link to the matching bug, provider-request, and model-request forms.
- Provider settings link to the bug form.
- Links open safely in a new tab and use existing en/zh client locale copy.
- All three GitHub forms ask for actionable information and the issue chooser does not offer a blank issue.
- Review the actual rendered plugin and provider settings pages to confirm the links' placement and wrapping.

## Verification

- `pnpm typecheck` passed, including the client UI TypeScript project.
- `pnpm exec tsc -p tsconfig.test.json --noEmit` passed.
- `pnpm test plugin` passed (61 tests).
- `pnpm build` passed after correcting the TypeScript compiler executable's Windows integrity level so it could write generated output files.
- Python/PyYAML parsed all three issue forms; required top-level keys, unique response IDs, and supported field types were checked. `config.yml` confirms blank issues are disabled.
- `git diff --check` passed.
- The live DSH preview was inspected on both the bundle settings page and a provider settings page; the three bundle links and provider bug-report link appeared in their intended locations.

## Document synchronization

- No README or API documentation change proposed; the links are discoverable at the relevant settings controls and the issue forms explain what information to provide.

## Open questions

- None for this change.
