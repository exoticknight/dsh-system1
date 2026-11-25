import type { DecideImplementation } from '../../src/contracts/provider.js'
import type { DecisionTransport } from '../../src/providers/decision-implementation.js'

/** Preserve the existing transport fixtures while exercising the new deployment registration. */
export function decisionFixture(transport: DecisionTransport): DecideImplementation {
  return {
    version: 1,
    models: {
      kind: 'deployment',
      inputs: ['text', 'image', 'audio', 'video'],
      async resolve(model, signal) {
        return { id: model, inputs: this.inputs, capabilities: await transport.describe(model, signal) }
      },
    },
    timeoutMs: () => transport.timeoutMs(),
    async execute(input, { model, requestId, signal }) {
      const { model: executed, revision, ...result } = await transport.evaluate({ ...input, model, requestId }, signal)
      return { model: executed, ...(revision !== undefined ? { revision } : {}), result }
    },
  }
}
