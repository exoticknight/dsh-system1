import { System1ProviderError } from '../contracts/error.js'

export interface JsonProviderConnection {
  readonly providerName: string
  readonly defaultBaseURL: string
  readonly resolveApiKey: () => string | undefined | Promise<string | undefined>
  readonly resolveBaseURL?: () => string | undefined
  readonly apiKeyRequired?: boolean
  readonly fetch?: typeof fetch
}

type SerializedRequest = {
  readonly body: Readonly<Record<string, unknown>>
  readonly headers?: Readonly<Record<string, string>>
}

export function createJsonPost(options: JsonProviderConnection) {
  const fetchFn = options.fetch ?? globalThis.fetch
  const { providerName } = options
  return async (
    path: string,
    serialize: () => SerializedRequest,
    signal: AbortSignal,
    onHttpError?: (response: Response) => Promise<System1ProviderError>,
  ): Promise<unknown> => {
    let apiKey: string | undefined
    try {
      apiKey = await options.resolveApiKey()
    } catch {
      throw new System1ProviderError({
        code: 'unavailable',
        message: `${providerName} API key could not be resolved.`,
      }, 'fallback', false)
    }
    if (options.apiKeyRequired !== false && !apiKey?.trim())
      throw new System1ProviderError({
        code: 'unavailable',
        message: `${providerName} API key is not configured.`,
      }, 'fallback', false)

    const baseURL = (options.resolveBaseURL?.() ?? options.defaultBaseURL).trim().replace(/\/+$/u, '')
    const serialized = serialize()
    let response: Response
    try {
      signal.throwIfAborted()
      response = await fetchFn(`${baseURL}${path}`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          ...serialized.headers,
          ...(apiKey?.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
        },
        body: JSON.stringify(serialized.body),
        signal,
      })
    } catch {
      signal.throwIfAborted()
      throw new System1ProviderError({
        code: 'provider_error',
        message: `${providerName} transport failed.`,
        retryable: true,
      }, 'fallback')
    }

    if (!response.ok) {
      if (onHttpError) throw await onHttpError(response)
      await response.body?.cancel()
      throw new System1ProviderError({
        code: response.status === 401 || response.status === 403 ? 'unavailable' : 'provider_error',
        message: `${providerName} request failed.`,
        httpStatus: response.status,
        retryable: response.status === 429 || response.status >= 500,
      }, 'fallback')
    }

    try {
      return await response.json()
    } catch {
      signal.throwIfAborted()
      throw invalidProviderResponse(providerName)
    }
  }
}

export function invalidProviderResponse(providerName: string): System1ProviderError {
  return new System1ProviderError({
    code: 'invalid_response',
    message: `${providerName} returned an invalid response.`,
  }, 'fallback')
}
