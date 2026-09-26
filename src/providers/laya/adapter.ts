import type { System1Provider } from '../../contracts/index.js'
import { createSystemOneHttpProvider } from '../systemone.js'

export interface LayaOptions {
  apiKey?: string
  baseURL?: string
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
}

const MODELS = new Set(['auto', 'english', 'multilingual', 'typed-decisions'])

export function createLayaProvider(options: LayaOptions): System1Provider {
  return createSystemOneHttpProvider({
    providerName: 'Laya',
    defaultBaseURL: options.baseURL ?? 'http://127.0.0.1:8000',
    resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
    ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
    apiKeyRequired: false,
    isModelSupported: (model) => MODELS.has(model),
    requestModel: (model) => model === 'auto' ? undefined : model,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
}
