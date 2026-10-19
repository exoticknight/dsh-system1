import type { ProviderModel } from '../../contracts/provider.js'

export const LAYA_MODELS = [
  { id: 'auto' },
  { id: 'english' },
  { id: 'multilingual' },
  { id: 'typed-decisions' },
] as const satisfies readonly ProviderModel[]
