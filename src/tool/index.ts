import type { Context } from '@deepseek-ai/cordis'
import type {} from '../index.js'
import type {
  DecideResponse,
  JsonValue,
  Question,
  Questions,
} from '../contracts/index.js'

export const TOOL_NAME = 'system1_decide'
// The bundle mounts this entry enabled; its row switch in DSH turns the tool off.
export const inject = ['system1', 'tools']

const PRIMITIVES = ['noul', 'choice', 'score'] as const
const ERROR_CODES = [
  'unavailable',
  'unsupported',
  'limit_exceeded',
  'timeout',
  'cancelled',
  'provider_error',
  'invalid_response',
] as const

const DESCRIPTION =
  'Ask System One, a fast classifier model, for probabilistic judgments about a piece of text. ' +
  'Use it for quick yes/no checks (noul), picking one category (choice) or rating on an ordered scale (score); ' +
  'several questions about the same text can go in one call. ' +
  'Results are probabilities, not decisions: weigh them and decide the next step yourself. ' +
  'Probabilities are in the range 0-1; score.value is the zero-based expected level index matching a criteria position. ' +
  'Confidence is backend-defined, is not a probability, and is not comparable across backends. ' +
  'Probabilities from different models are not calibrated against each other. When a provider succeeds, the model field identifies who answered; if every provider fails, model is omitted. ' +
  'A question that fails returns status "error" without affecting the others.'

/** Raw JSON Schema accepted by the DSH tool registry (the enforced subset). */
const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['state', 'questions'],
  properties: {
    state: {
      description: 'The text or JSON value to judge.',
    },
    questions: {
      type: 'array',
      description: 'Questions about the state, answered independently.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'instructions'],
        properties: {
          id: { type: 'string', description: 'Unique key for this answer.' },
          type: {
            type: 'string',
            enum: [...PRIMITIVES],
            description:
              'noul: probability the statement is true; choice: pick one key of criteria; score: expected level over criteria.',
          },
          instructions: {
            type: 'string',
            description: 'The question or statement to evaluate.',
          },
          criteria: {
            description:
              'choice: object mapping each candidate key to its description (required). ' +
              'score: array of level descriptions from lowest to highest (required). ' +
              'noul: optional { "true": ..., "false": ... } meanings.',
          },
        },
      },
    },
    model: {
      type: 'object',
      additionalProperties: false,
      required: ['provider', 'model'],
      description:
        'Optional backend override; omit to use the configured default and its fallback models.',
      properties: {
        provider: { type: 'string' },
        model: { type: 'string' },
      },
    },
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answers'],
  properties: {
    answers: { type: 'object' },
    model: {
      type: 'object',
      additionalProperties: false,
      required: ['provider', 'model'],
      properties: {
        provider: { type: 'string' },
        model: { type: 'string' },
      },
    },
    fallbacks: {
      type: 'array',
      description: 'Failed provider and model attempts, in order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['provider', 'model', 'error'],
        properties: {
          provider: { type: 'string' },
          model: { type: 'string' },
          error: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', enum: [...ERROR_CODES] },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

interface ToolArgs {
  state: JsonValue
  questions: readonly { id: string; type: string; instructions: string; criteria?: JsonValue }[]
  model?: { provider: string; model: string }
}

interface ToolRegistry {
  register(definition: object): () => void
}

export function apply(ctx: Context) {
  const tools = ctx.get('tools') as unknown as ToolRegistry
  ctx.effect(() =>
    tools.register({
      name: TOOL_NAME,
      description: DESCRIPTION,
      parameters: PARAMETERS,
      output: {
        schema: OUTPUT_SCHEMA,
        render: (_args: unknown, value: unknown) => [
          { type: 'text', text: JSON.stringify(value) },
        ],
      },
      isConcurrencySafe: () => true,
      async execute(raw: unknown, exec: { signal: AbortSignal }) {
        const args = raw as ToolArgs
        const response = await ctx.system1.decide({
          state: args.state,
          questions: toQuestions(args.questions),
          ...(args.model ? { model: args.model } : {}),
          signal: exec.signal,
        })
        return toOutput(response)
      },
    }),
  )
}

function toQuestions(list: ToolArgs['questions']): Questions {
  if (!Array.isArray(list) || list.length === 0)
    throw new Error('questions must be a non-empty array')
  const questions: Record<string, Question> = {}
  for (const { id, type, instructions, criteria } of list) {
    if (typeof id !== 'string' || id.length === 0)
      throw new Error('every question needs a non-empty string id')
    if (Object.hasOwn(questions, id))
      throw new Error(`duplicate question id ${JSON.stringify(id)}`)
    questions[id] = {
      type,
      instructions,
      ...(criteria !== undefined ? { criteria } : {}),
    } as Question
  }
  return questions
}

function toOutput(response: DecideResponse) {
  const answers: Record<string, JsonValue> = {}
  for (const [id, result] of Object.entries(response.answers)) {
    answers[id] =
      result.status === 'ok'
        ? { status: 'ok', answer: JSON.parse(JSON.stringify(result.answer)) }
        : {
            status: 'error',
            error: { code: result.error.code, message: result.error.message },
          }
  }
  return {
    answers,
    ...(response.meta.executed
      ? {
          model: {
            provider: response.meta.executed.provider,
            model: response.meta.executed.model,
          },
        }
      : {}),
    ...(response.meta.attempts?.length
      ? {
          fallbacks: response.meta.attempts.map(({ provider, model, error }) => ({
            provider,
            model,
            error: { code: error.code, message: error.message },
          })),
        }
      : {}),
  }
}
