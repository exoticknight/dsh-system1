import type { ProviderModel } from '../../contracts/provider.js'

export const LIQUID_BASE_URL = 'https://api.liquid.ai/decisions'
export const LIQUID_TIMEOUT_MS = 10_000

export const LIQUID_MODELS = [
  { id: 'd1.2' },
  { id: 'd1.2-ultra' },
] as const satisfies readonly ProviderModel[]
