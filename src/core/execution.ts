import { System1ProviderError } from '../contracts/error.js'

/** Bounds our wait even if a third-party provider fails to observe its signal. */
export async function execute<T>(
  signals: readonly AbortSignal[],
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const deadline = performance.now() + timeoutMs
  const listeners: Array<() => void> = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let abortListener: (() => void) | undefined
  const cancel = () =>
    controller.abort(
      new System1ProviderError({
        code: 'cancelled',
        message: 'Decision cancelled.',
      }),
    )
  try {
    for (const signal of signals) {
      if (signal.aborted) {
        cancel()
        break
      }
      signal.addEventListener('abort', cancel, { once: true })
      listeners.push(() => signal.removeEventListener('abort', cancel))
    }
    if (controller.signal.aborted) throw controller.signal.reason
    const timeout = () =>
      controller.abort(
        new System1ProviderError({
          code: 'timeout',
          message: 'Decision exceeded its total time budget.',
        }),
      )
    timer = setTimeout(timeout, timeoutMs)
    const interrupted = new Promise<never>((_, reject) => {
      abortListener = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', abortListener, { once: true })
    })
    const pending = Promise.resolve().then(() => {
      controller.signal.throwIfAborted()
      return operation(controller.signal)
    })
    const result = await Promise.race([pending, interrupted])
    if (performance.now() >= deadline) timeout()
    controller.signal.throwIfAborted()
    return result
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    if (abortListener)
      controller.signal.removeEventListener('abort', abortListener)
    for (const remove of listeners) remove()
  }
}
