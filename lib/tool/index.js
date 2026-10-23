import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_COUNT_PER_TYPE, MAX_TOTAL_ATTACHMENT_BYTES, } from '../core/validation.js';
export const TOOL_NAME = 'system1_decide';
// The bundle mounts this entry enabled; its row switch in DSH turns the tool off.
export const inject = ['system1', 'tools'];
const PRIMITIVES = ['noul', 'choice', 'score', 'box'];
const ERROR_CODES = [
    'unavailable',
    'unsupported',
    'limit_exceeded',
    'timeout',
    'cancelled',
    'provider_error',
    'invalid_response',
];
const MIB = 1024 * 1024;
const ATTACHMENT_RESOURCE_LIMITS = `up to ${MAX_ATTACHMENT_COUNT_PER_TYPE} items, ${MAX_ATTACHMENT_BYTES / MIB} MiB per item, ` +
    `${MAX_TOTAL_ATTACHMENT_BYTES / MIB} MiB total decoded across all attachment types`;
const DESCRIPTION = 'Ask System One for probabilistic judgments about shared text or JSON state, with optional image, audio, and video attachments. ' +
    'Use noul for yes/no checks, choice for categories, score for an ordered scale, and box to locate an object in an image; ' +
    'several questions about the same input can go in one call. ' +
    'Results are probabilities, not decisions: weigh them and decide the next step yourself. ' +
    'Probabilities are in the range 0-1; score.value is the zero-based expected level index matching a criteria position. ' +
    'A box answer contains top, bottom, left, and right image coordinates from 0 to 1. ' +
    'Confidence is backend-defined, is not a probability, and is not comparable across backends. ' +
    'Probabilities from different models are not calibrated against each other. When a provider succeeds, the model field identifies who answered; if every provider fails, model is omitted. ' +
    'A box question needs an image and a model that supports box answers. ' +
    'A question that fails returns status "error" without affecting the others.';
/** Raw JSON Schema accepted by the DSH tool registry (the enforced subset). */
const PARAMETERS = {
    type: 'object',
    additionalProperties: false,
    required: ['state', 'questions'],
    properties: {
        state: {
            description: 'The text or JSON value to judge.',
        },
        images: {
            type: 'array',
            maxItems: MAX_ATTACHMENT_COUNT_PER_TYPE,
            description: `Optional image attachments visible to every question (${ATTACHMENT_RESOURCE_LIMITS}). Each data value is padded base64 without a data-URL prefix. Provider limits may be lower. TypeSafe supports PNG and JPEG; Cloudflare and Nace drex-max also support WebP.`,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['mediaType', 'data'],
                properties: {
                    mediaType: {
                        type: 'string',
                        enum: ['image/png', 'image/jpeg', 'image/webp'],
                    },
                    data: { type: 'string' },
                },
            },
        },
        audio: {
            type: 'array',
            maxItems: MAX_ATTACHMENT_COUNT_PER_TYPE,
            description: `Optional audio clips (${ATTACHMENT_RESOURCE_LIMITS}). Cloudflare Clef-omni allows up to 4, 8 MiB each, 300 seconds each; audio and video share a 16 MiB decoded-size limit. Provider limits may be lower. Each data value is padded base64 without a data-URL prefix.`,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['mediaType', 'data'],
                properties: {
                    mediaType: { type: 'string', enum: ['audio/wav', 'audio/mpeg'] },
                    data: { type: 'string' },
                },
            },
        },
        videos: {
            type: 'array',
            maxItems: MAX_ATTACHMENT_COUNT_PER_TYPE,
            description: `Optional videos (${ATTACHMENT_RESOURCE_LIMITS}). Cloudflare Clef-omni allows up to 2, 16 MiB each, 60 seconds each, sampled at 2 fps; audio and video share a 16 MiB decoded-size limit. Provider limits may be lower. Each data value is padded base64 without a data-URL prefix.`,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['mediaType', 'data'],
                properties: {
                    mediaType: { type: 'string', enum: ['video/mp4', 'video/webm'] },
                    data: { type: 'string' },
                },
            },
        },
        longContext: {
            type: 'boolean',
            description: 'Opt in to extended context on providers that support it. TypeSafe Jev supports up to 262k tokens; other providers may reject this request.',
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
                        description: 'noul: probability the statement is true; choice: pick one key of criteria; score: expected level over criteria.',
                    },
                    instructions: {
                        type: 'string',
                        description: 'The question or statement to evaluate.',
                    },
                    criteria: {
                        description: 'choice: object mapping each candidate key to its description (required). ' +
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
            description: 'Optional backend override; omit to use the configured default and its fallback models.',
            properties: {
                provider: { type: 'string' },
                model: { type: 'string' },
            },
        },
    },
};
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
};
export function apply(ctx) {
    const tools = ctx.get('tools');
    ctx.effect(() => tools.register({
        name: TOOL_NAME,
        description: DESCRIPTION,
        parameters: PARAMETERS,
        output: {
            schema: OUTPUT_SCHEMA,
            render: (_args, value) => [
                { type: 'text', text: JSON.stringify(value) },
            ],
        },
        isConcurrencySafe: () => true,
        async execute(raw, exec) {
            const args = raw;
            const response = await ctx.system1.decide({
                state: args.state,
                questions: toQuestions(args.questions),
                ...(args.images ? { images: args.images } : {}),
                ...(args.audio ? { audio: args.audio } : {}),
                ...(args.videos ? { videos: args.videos } : {}),
                ...(args.longContext ? { longContext: true } : {}),
                ...(args.model ? { model: args.model } : {}),
                signal: exec.signal,
            });
            return toOutput(response);
        },
    }));
}
function toQuestions(list) {
    if (!Array.isArray(list) || list.length === 0)
        throw new Error('questions must be a non-empty array');
    const questions = {};
    for (const { id, type, instructions, criteria } of list) {
        if (typeof id !== 'string' || id.length === 0)
            throw new Error('every question needs a non-empty string id');
        if (Object.hasOwn(questions, id))
            throw new Error(`duplicate question id ${JSON.stringify(id)}`);
        questions[id] = {
            type,
            instructions,
            ...(criteria !== undefined ? { criteria } : {}),
        };
    }
    return questions;
}
function toOutput(response) {
    const answers = {};
    for (const [id, result] of Object.entries(response.answers)) {
        answers[id] =
            result.status === 'ok'
                ? { status: 'ok', answer: JSON.parse(JSON.stringify(result.answer)) }
                : {
                    status: 'error',
                    error: { code: result.error.code, message: result.error.message },
                };
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
    };
}
//# sourceMappingURL=index.js.map