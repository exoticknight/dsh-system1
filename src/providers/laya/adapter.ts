import type { System1Provider } from '../../contracts/index.js'
import { findProviderModel } from '../models.js'
import { createSystemOneHttpProvider } from '../systemone.js'
import { LAYA_MODELS } from './models.js'

const DEFAULT_TIMEOUT_MS = 800

export interface LayaOptions {
  apiKey?: string
  baseURL?: string
  timeoutMs?: number
  resolveTimeoutMs?: () => number | undefined
  resolveApiKey?: () => string | undefined | Promise<string | undefined>
  resolveBaseURL?: () => string | undefined
  fetch?: typeof fetch
}

export function createLayaProvider(options: LayaOptions): System1Provider {
  return createSystemOneHttpProvider({
    providerName: 'Laya',
    defaultBaseURL: options.baseURL ?? 'http://127.0.0.1:8000',
    timeoutMs: () => options.resolveTimeoutMs?.() ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    resolveApiKey: options.resolveApiKey ?? (() => options.apiKey),
    ...(options.resolveBaseURL ? { resolveBaseURL: options.resolveBaseURL } : {}),
    apiKeyRequired: false,
    resolveModel: (model) => findProviderModel(LAYA_MODELS, model),
    requestModel: (model) => model === 'auto' ? undefined : model,
    selectResponseModel: (response) => {
      const routing = response.routing
      if (!routing || typeof routing !== 'object') return undefined
      const model = (routing as { model?: unknown }).model
      return typeof model === 'string' && model.trim() ? model : undefined
    },
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
}
