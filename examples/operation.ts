import type { Context } from '@deepseek-ai/cordis'
import { defineOperation } from 'dsh-system1'
import type { OperationImplementation } from 'dsh-system1/contracts'

type Input = { text: string }
type Output = { words: number }
type Capabilities = { maxCharacters: number }

export const countWords = defineOperation<Input, Output, Capabilities>({
  id: 'example.count-words',
  version: 1,
  title: 'Count words',
  inputKinds: [{ id: 'text', title: 'Text' }],
  getInputKind: () => 'text',
  parseInput(value) {
    if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string')
      throw new TypeError('Expected text.')
    return { text: value.text }
  },
  parseOutput(value) {
    if (!value || typeof value !== 'object' || !('words' in value) || typeof value.words !== 'number'
      || !Number.isSafeInteger(value.words) || value.words < 0)
      throw new TypeError('Expected a nonnegative integer word count.')
    return { words: value.words }
  },
  checkCapabilities: ({ text }, { maxCharacters }) => text.length > maxCharacters
    ? { code: 'limit_exceeded', message: 'Text is too long for this model.' }
    : undefined,
  tool: {
    name: 'example_count_words',
    description: 'Count whitespace-separated words in a string.',
    parameters: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } },
    toOutput: (result) => result.status === 'ok' ? result.value : { error: result.error },
  },
})

const local: OperationImplementation<Input, Output, Capabilities> = {
  version: countWords.version,
  models: {
    kind: 'fixed',
    models: [{ id: 'local-v1', inputs: ['text'], capabilities: { maxCharacters: 4096 } }],
  },
  timeoutMs: () => 100,
  async execute({ text }, { model }) {
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/u).length
    return { model, result: { words } }
  },
}

/** Load separately, then enable Count words and select example/local-v1 on its tab. */
export default {
  inject: ['system1'],
  apply(ctx: Context) {
    ctx.effect(() => ctx.system1.registerOperation(countWords))
    ctx.effect(() => ctx.system1.registerImplementation(countWords, 'example', local))
  },
}
