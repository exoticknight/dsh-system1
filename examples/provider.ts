import type { Context } from '@deepseek-ai/cordis'
import type { ProviderModel, System1Provider } from 'dsh-system1/contracts'
import { findProviderModel } from 'dsh-system1/providers'
import type {} from 'dsh-system1'

const EXAMPLE_MODELS = [
  { id: 'example-v2', aliases: ['example-latest'] },
] as const satisfies readonly ProviderModel[]

export function resolveExampleModel(model: string) {
  return findProviderModel(EXAMPLE_MODELS, model)
}

/** Wrap an independently implemented backend in its owning plugin lifecycle. */
export function providerPlugin(id: string, backend: System1Provider) {
  return {
    inject: ['system1'],
    apply(ctx: Context) {
      ctx.effect(() => ctx.system1.registerProvider(id, backend))
    },
  }
}
