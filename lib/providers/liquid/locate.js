import { z } from 'zod';
import { System1ProviderError } from '../../contracts/error.js';
import { locateOperation } from '../../contracts/locate.js';
import { createJsonPost, invalidProviderResponse } from '../http.js';
import { LIQUID_BASE_URL, LIQUID_MODELS, LIQUID_TIMEOUT_MS } from './models.js';
const NAME = 'Liquid AI';
const MAX_BODY_BYTES = 4_500_000;
const MAX_TEXT_BYTES = 250_000;
const IMAGE_STATE = 'The source is the attached image.';
const probability = z.number().min(0).max(1);
const point = z.number().int().nonnegative();
const listMetadata = { at_least: z.boolean().optional(), count: point.optional() };
const answer = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('spans'),
        spans: z.array(z.object({
            text: z.string().min(1),
            span: z.tuple([point, point]),
            found: probability.optional(),
        })).max(16),
        ...listMetadata,
    }),
    z.object({
        type: z.literal('boxes'),
        boxes: z.array(z.object({
            box: z.object({ top: probability, bottom: probability, left: probability, right: probability }),
            found: probability.optional(),
            confidence: probability.optional(),
        })).max(16),
        ...listMetadata,
    }),
]);
const response = z.object({ model: z.string().min(1), answers: z.object({ q: answer }) });
export function createLiquidLocateProvider(options = {}) {
    const post = createJsonPost({
        providerName: NAME,
        defaultBaseURL: options.baseURL ?? LIQUID_BASE_URL,
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    return {
        version: locateOperation.version,
        models: {
            kind: 'fixed',
            models: LIQUID_MODELS.map(({ id }) => ({
                id,
                inputs: ['text', 'image'],
                capabilities: { checkInput: (input) => checkInput(input, id) },
            })),
        },
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? LIQUID_TIMEOUT_MS,
        async execute(input, { model, signal }) {
            const raw = await post('/v1/systemone', () => ({ body: wireBody(input, model) }), signal, mapHttpError);
            const parsed = response.safeParse(raw);
            if (!parsed.success)
                throw invalidProviderResponse(NAME);
            const q = parsed.data.answers.q;
            const completeness = q.at_least === undefined ? {} : { mayHaveMore: q.at_least };
            if (q.type === 'spans' && input.source.type === 'text') {
                if (q.count !== undefined && q.count !== q.spans.length)
                    throw invalidProviderResponse(NAME);
                const matches = q.spans.map(({ text, span: [start, end], found }) => ({
                    text, start, end, ...presence(found),
                }));
                return { model: parsed.data.model, result: { matches, ...completeness } };
            }
            if (q.type === 'boxes' && input.source.type === 'image') {
                if (q.count !== undefined && q.count !== q.boxes.length)
                    throw invalidProviderResponse(NAME);
                const matches = q.boxes.map(({ box, found, confidence }) => ({
                    ...box,
                    ...presence(found),
                    ...(confidence === undefined ? {} : { locationConfidence: confidence }),
                }));
                return { model: parsed.data.model, result: { matches, ...completeness } };
            }
            throw invalidProviderResponse(NAME);
        },
    };
}
function wireBody({ source, instructions }, model) {
    if (source.type === 'text')
        return { model, state: source.text, questions: { q: { type: 'spans', instructions } } };
    return {
        model,
        state: IMAGE_STATE,
        questions: { q: { type: 'boxes', instructions } },
        images: [{ content_type: source.image.mediaType, base64: source.image.data }],
    };
}
function checkInput(input, model) {
    const state = input.source.type === 'text' ? input.source.text : IMAGE_STATE;
    if (Buffer.byteLength(state) + Buffer.byteLength(input.instructions) > MAX_TEXT_BYTES)
        return { code: 'limit_exceeded', message: 'Liquid AI Locate exceeds 250,000 bytes of text for one question.' };
    if (Buffer.byteLength(JSON.stringify(wireBody(input, model))) >= MAX_BODY_BYTES)
        return { code: 'limit_exceeded', message: 'Liquid AI requires an encoded request body under 4.5 MB.' };
}
function presence(found) {
    return found === undefined ? {} : { presenceProbability: found };
}
async function mapHttpError(response) {
    await response.body?.cancel();
    const status = response.status;
    return new System1ProviderError({
        code: status === 401 || status === 403 ? 'unavailable'
            : status === 413 ? 'limit_exceeded' : 'provider_error',
        message: 'Liquid AI Locate request failed.',
        httpStatus: status,
        retryable: status === 429 || status >= 500,
    }, 'fallback');
}
//# sourceMappingURL=locate.js.map