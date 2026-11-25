import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS, imageInput } from 'nace-sdk';
import { z } from 'zod';
import { System1ProviderError } from '../../contracts/error.js';
import { locateOperation } from '../../contracts/locate.js';
import { createJsonPost, invalidProviderResponse } from '../http.js';
const NAME = 'Nace';
const TEXT_MODEL = 'drex-max-locate';
const IMAGE_MODEL = 'drex-max-box';
const MAX_STATE_POINTS = 28_000;
const MAX_INSTRUCTION_POINTS = 4_000;
const MAX_DATA_URL_LENGTH = 4_000_000;
const score = z.number().min(0).max(1);
const point = z.number().int().nonnegative();
const coordinate = z.number().min(0).max(1000);
const span = z.object({ start: point, end: point, text: z.string().min(1), score });
const locateWire = z.object({
    model: z.literal(TEXT_MODEL),
    answers: z.object({ q: z.object({ type: z.literal('locate'), spans: z.array(span) }) }),
});
const boxWire = z.object({
    model: z.literal(IMAGE_MODEL),
    answers: z.object({
        q: z.object({
            type: z.literal('box'),
            boxes: z.array(z.object({
                bbox: z.tuple([coordinate, coordinate, coordinate, coordinate])
                    .refine(([left, top, right, bottom]) => left <= right && top <= bottom),
                score,
            })),
        }),
    }),
});
// The released Nace SDK 0.11.1 covers System One and image inputs, but has no
// packaged methods for these dedicated endpoints. Follow the public OpenAPI.
export function createNaceLocateProvider(options) {
    const post = createJsonPost({
        providerName: NAME,
        defaultBaseURL: options.baseURL ?? DEFAULT_BASE_URL,
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    return {
        version: locateOperation.version,
        models: {
            kind: 'fixed',
            models: [
                { id: TEXT_MODEL, inputs: ['text'], capabilities: { checkInput } },
                { id: IMAGE_MODEL, inputs: ['image'], capabilities: { checkInput } },
            ],
        },
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        async execute({ source, instructions }, { model, signal }) {
            if (source.type === 'text' && model === TEXT_MODEL) {
                const raw = await post('/v1/locate', () => ({
                    body: { state: source.text, instructions },
                }), signal, mapHttpError);
                const parsed = locateWire.safeParse(raw);
                if (!parsed.success)
                    throw invalidProviderResponse(NAME);
                return { model: parsed.data.model, result: { matches: normalizeSpans(source.text, parsed.data.answers.q.spans) } };
            }
            if (source.type === 'image' && model === IMAGE_MODEL) {
                const raw = await post('/v1/box', () => ({
                    body: { image: dataURL(source.image), instructions },
                }), signal, mapHttpError);
                const parsed = boxWire.safeParse(raw);
                if (!parsed.success)
                    throw invalidProviderResponse(NAME);
                const matches = parsed.data.answers.q.boxes.map(({ bbox: [left, top, right, bottom], score }) => ({
                    left: left / 1000, top: top / 1000, right: right / 1000, bottom: bottom / 1000, matchScore: score,
                }));
                return { model: parsed.data.model, result: { matches } };
            }
            throw new System1ProviderError({
                code: 'unsupported',
                message: 'Nace model does not support this Locate source.',
            }, 'fallback');
        },
    };
}
function checkInput({ source, instructions }) {
    if (exceedsCodePoints(instructions.trim(), MAX_INSTRUCTION_POINTS))
        return { code: 'limit_exceeded', message: 'Nace Locate instructions exceed 4,000 Unicode code points.' };
    if (source.type === 'text') {
        if (exceedsCodePoints(source.text, MAX_STATE_POINTS))
            return { code: 'limit_exceeded', message: 'Nace Locate source text exceeds 28,000 Unicode code points.' };
        return;
    }
    if (dataURL(source.image).length > MAX_DATA_URL_LENGTH)
        return { code: 'limit_exceeded', message: 'Nace Box image data URL exceeds 4,000,000 characters.' };
    // Reuse the SDK's existing image format checks before sending an inline image.
    try {
        const inline = imageInput(Buffer.from(source.image.data, 'base64'));
        if (typeof inline === 'string' && inline.startsWith(`data:${source.image.mediaType};base64,`))
            return;
    }
    catch {
        // Invalid image bytes are not an eligible Nace Box request.
    }
    return { code: 'unsupported', message: 'Nace Box requires image bytes matching their declared PNG, JPEG, or WebP type.' };
}
function dataURL({ mediaType, data }) {
    return `data:${mediaType};base64,${data}`;
}
function exceedsCodePoints(text, limit) {
    let count = 0;
    for (const _point of text)
        if (++count > limit)
            return true;
    return false;
}
// Nace documents a half-open range but leaves the offset unit unspecified.
// Interpret the reported offsets, never search the text for another occurrence.
// One unit must fit the entire answer; reject multiple distinct interpretations.
function normalizeSpans(text, spans) {
    if (spans.length === 0)
        return [];
    const utf16Offsets = [0];
    const utf16ToCodePoint = new Map([[0, 0]]);
    const utf8ToCodePoint = new Map([[0, 0]]);
    let utf16 = 0, utf8 = 0, codePoint = 0;
    for (const point of text) {
        utf16 += point.length;
        utf8 += Buffer.byteLength(point);
        codePoint++;
        utf16Offsets.push(utf16);
        utf16ToCodePoint.set(utf16, codePoint);
        utf8ToCodePoint.set(utf8, codePoint);
    }
    const interpretations = [
        (offset) => offset,
        (offset) => utf16ToCodePoint.get(offset),
        (offset) => utf8ToCodePoint.get(offset),
    ];
    let agreed;
    for (const resolve of interpretations) {
        const matches = [];
        for (const span of spans) {
            const start = resolve(span.start), end = resolve(span.end);
            if (start === undefined || end === undefined || start >= end)
                break;
            const from = utf16Offsets[start], to = utf16Offsets[end];
            if (from === undefined || to === undefined || text.slice(from, to) !== span.text)
                break;
            matches.push({ start, end, text: span.text, matchScore: span.score });
        }
        if (matches.length !== spans.length)
            continue;
        if (!agreed) {
            agreed = matches;
        }
        else {
            const previous = agreed;
            if (matches.some(({ start, end }, i) => start !== previous[i]?.start || end !== previous[i]?.end))
                throw invalidProviderResponse(NAME);
        }
    }
    if (!agreed)
        throw invalidProviderResponse(NAME);
    return agreed;
}
async function mapHttpError(response) {
    const status = response.status;
    if (status === 403) {
        // A 403 can represent Zero retention. Decide from the status before the
        // response body (or its cancellation) can time out and trigger fallback.
        void response.body?.cancel().catch(() => undefined);
        return new System1ProviderError({
            code: 'unavailable',
            message: 'Nace denied the Locate or Box request. Check inference access and the account’s retention setting.',
            httpStatus: status,
        }, 'stop');
    }
    await response.body?.cancel();
    return new System1ProviderError({
        code: status === 401 || status === 402 ? 'unavailable'
            : status === 413 ? 'limit_exceeded' : 'provider_error',
        message: 'Nace Locate or Box request failed.',
        httpStatus: status,
        retryable: status === 429 || status >= 500,
    }, 'fallback');
}
//# sourceMappingURL=locate.js.map