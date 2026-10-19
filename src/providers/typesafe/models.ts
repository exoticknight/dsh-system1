import type { ProviderModel } from '../../contracts/provider.js'

export const TYPESAFE_MODELS = [
  { id: 'jev-latest' },
  { id: 'jev-preview' },
  { id: 'jev-1.14.0' },
  { id: 'jev-1.13.0' },
] as const satisfies readonly ProviderModel[]
