import { randomUUID } from 'node:crypto';
import { findProviderModel } from '../models.js';
import { TYPESAFE_MODELS } from './models.js';
import { createSystemOneHttpProvider } from '../systemone.js';
const DEFAULT_TIMEOUT_MS = 800;
export function createTypesafeProvider(options) {
    return createSystemOneHttpProvider({
        providerName: 'TypeSafe',
        defaultBaseURL: options.baseURL ?? 'https://api.typesafe.ai',
        timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
        ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
        apiKeyRequired: true,
        resolveModel: (model) => findProviderModel(TYPESAFE_MODELS, model),
        capabilities: (model) => ({
            primitives: [
                'noul',
                'choice',
                'score',
                ...(model === 'jev-1.14.0' || model === 'jev-preview' ? ['box'] : []),
            ],
            maxQuestions: null,
            maxChoiceOptions: 255,
            maxScoreLevels: 10,
            images: {
                formats: ['image/png', 'image/jpeg'],
                maxCount: 4,
                maxBytesPerImage: 16 * 1024 * 1024,
                maxTotalBytes: 16 * 1024 * 1024,
            },
            longContext: { maxTokens: 262_144 },
            context: {
                maxTokens: 64_000,
                includesQuestions: true,
                maxStatePlusQuestionTokens: 32_000,
            },
        }),
        serializeRequest: (request) => {
            const assets = {};
            const imageReferences = (request.images ?? []).map((image) => {
                const reference = randomUUID();
                assets[reference] = {
                    type: 'image',
                    format: image.mediaType === 'image/png' ? 'png' : 'jpg',
                    data_base64: image.data,
                };
                return reference;
            });
            const needsImagesHeader = imageReferences.length > 0 ||
                Object.values(request.questions).some((question) => question.type === 'box');
            return {
                body: {
                    state: imageReferences.length
                        ? { state: request.state, images: imageReferences }
                        : request.state,
                    questions: request.questions,
                    ...(imageReferences.length ? { assets } : {}),
                },
                headers: {
                    ...(needsImagesHeader
                        ? { 'TypeSafe-Danger-Zone-Images': 'true' }
                        : {}),
                    ...(request.longContext
                        ? { 'TypeSafe-Danger-Zone-Long-Context': 'true' }
                        : {}),
                },
            };
        },
        ...(options.fetch ? { fetch: options.fetch } : {}),
    });
}
//# sourceMappingURL=adapter.js.map