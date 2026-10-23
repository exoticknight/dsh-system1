import type { ProviderModel } from '../../contracts/provider.js'

export const NACE_MODELS = [
  { id: 'drex-v2.0' },
  { id: 'drex-v1.5' },
  { id: 'drex-max' },
] as const satisfies readonly ProviderModel[]
