import type { Context } from '@deepseek-ai/cordis'
import type { System1Provider } from 'dsh-system1/contracts'
import type {} from 'dsh-system1'

/** Wrap an independently implemented backend in its owning plugin lifecycle. */
export function providerPlugin(id: string, backend: System1Provider) {
  return {
    inject: ['system1'],
    apply(ctx: Context) {
      ctx.effect(() => ctx.system1.registerProvider(id, backend))
    },
  }
}
