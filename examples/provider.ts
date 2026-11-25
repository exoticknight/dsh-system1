import type { Context } from '@deepseek-ai/cordis'
import { decideOperation } from 'dsh-system1'
import type { DecideImplementation, ModelCapabilities } from 'dsh-system1/contracts'

const capabilities: ModelCapabilities = {
  primitives: ['noul'],
  maxQuestions: 1,
  maxChoiceOptions: null,
  maxScoreLevels: null,
}

/** Wrap an independently implemented backend in its owning plugin lifecycle. */
export function providerPlugin(id: string, execute: DecideImplementation['execute']) {
  const implementation: DecideImplementation = {
    version: decideOperation.version,
    models: {
      kind: 'fixed',
      models: [{ id: 'example-v2', aliases: ['example-latest'], inputs: ['text'], capabilities }],
    },
    timeoutMs: () => 800,
    execute,
  }
  return {
    inject: ['system1'],
    apply(ctx: Context) {
      ctx.effect(() => ctx.system1.registerImplementation(decideOperation, id, implementation))
    },
  }
}
