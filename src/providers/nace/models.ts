import type { ProviderModel } from '../../contracts/provider.js'

export const NACE_MODELS = [
  { id: 'drex-v2.0' },
  { id: 'drex-max-v1.1' },
  { id: 'drex-max-finance' },
  { id: 'drex-v1.5', retiredTo: 'drex-max-v1.1' },
  { id: 'drex-max', retiredTo: 'drex-max-v1.1' },
] as const satisfies readonly (ProviderModel & { retiredTo?: string })[]
