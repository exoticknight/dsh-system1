import type { ProviderModel } from '../../contracts/provider.js'

export const CLOUDFLARE_MODELS = [
  { id: 'clef', aliases: ['@cf/cloudflare/clef'] },
  { id: 'clef-flash', aliases: ['@cf/cloudflare/clef-flash'] },
  { id: 'clef-omni', aliases: ['@cf/cloudflare/clef-omni'] },
] as const satisfies readonly ProviderModel[]
