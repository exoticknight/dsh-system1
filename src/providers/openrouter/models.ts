import type { ProviderModel } from '../../contracts/provider.js'

export const OPENROUTER_FREE_MODEL = 'perplexity/pplx-decider-v1.3:free'
export const OPENROUTER_EXECUTED_MODEL = 'perplexity/pplx-decider-v1.3-20261112'

export const OPENROUTER_MODELS = [
  { id: OPENROUTER_FREE_MODEL },
] as const satisfies readonly ProviderModel[]
