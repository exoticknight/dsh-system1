import type { ProviderModel } from '../../contracts/provider.js'

export const MERAGPT_MODELS = [
  { id: 'decider-1', aliases: ['sd-1', 'state-decider-1'] },
] as const satisfies readonly ProviderModel[]
