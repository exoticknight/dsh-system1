export const RELEASE_NOTICE_LOCK_NAME = 'dsh-system1:release-notes'
export type ReleaseNoticeLocks = Pick<LockManager, 'request'>

const DATABASE_NAME = 'dsh-system1-release-notes-locks'
const DATABASE_VERSION = 1
const LOCK_STORE = 'locks'
const LOCK_LEASE_MS = 30_000
const LOCK_RETRY_MS = 50

type Lease = {
  owner: string
  expiresAt: number
}

type LockCallback<T> = (lock: Lock | null) => T | PromiseLike<T>

/**
 * Web Locks are the primary coordinator. IndexedDB is the insecure-HTTP
 * fallback: overlapping readwrite transactions serialize acquisition, and
 * the short lease lets another tab recover if its owner disappears.
 */
export function createIndexedDbReleaseNoticeLocks(
  factory: Pick<IDBFactory, 'open'>,
  databaseName = DATABASE_NAME,
): ReleaseNoticeLocks {
  const database = openDatabase(factory, databaseName)
  const request = <T>(
    name: string,
    optionsOrCallback: LockOptions | LockCallback<T>,
    maybeCallback?: LockCallback<T>,
  ): Promise<T> => {
    const callback = typeof optionsOrCallback === 'function'
      ? optionsOrCallback
      : maybeCallback
    if (callback === undefined) return Promise.reject(new TypeError('A lock callback is required.'))

    const signal = typeof optionsOrCallback === 'function'
      ? undefined
      : optionsOrCallback.signal
    return runWithIndexedDbLock(database, name, signal, () => callback(null))
  }

  return { request } as unknown as ReleaseNoticeLocks
}

export function resolveReleaseNoticeLocks(
  webLocks: ReleaseNoticeLocks | undefined,
  factory: Pick<IDBFactory, 'open'> | undefined,
): ReleaseNoticeLocks | undefined {
  if (webLocks !== undefined) return webLocks
  return factory === undefined ? undefined : createIndexedDbReleaseNoticeLocks(factory)
}

function openDatabase(factory: Pick<IDBFactory, 'open'>, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest
    try {
      request = factory.open(name, DATABASE_VERSION)
    } catch (error) {
      reject(error)
      return
    }

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(LOCK_STORE))
        database.createObjectStore(LOCK_STORE)
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open release notice lock database.'))
  })
}

async function runWithIndexedDbLock<T>(
  databasePromise: Promise<IDBDatabase>,
  name: string,
  signal: AbortSignal | undefined,
  callback: () => T | PromiseLike<T>,
): Promise<T> {
  const database = await databasePromise
  const owner = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  while (true) {
    if (signal?.aborted) throw abortReason(signal)
    if (await tryAcquire(database, name, owner)) break
    await waitForRetry(signal)
  }

  try {
    if (signal?.aborted) throw abortReason(signal)
    return await callback()
  } finally {
    try {
      await release(database, name, owner)
    } catch {
      // The lease expires if the browser cannot clear it explicitly.
    }
  }
}

function tryAcquire(database: IDBDatabase, name: string, owner: string): Promise<boolean> {
  const transaction = database.transaction(LOCK_STORE, 'readwrite')
  const finished = transactionFinished(transaction)
  let acquired = false
  const request = transaction.objectStore(LOCK_STORE).get(name)
  request.onsuccess = () => {
    if (isLiveLease(request.result, Date.now())) return
    acquired = true
    transaction.objectStore(LOCK_STORE).put({
      owner,
      expiresAt: Date.now() + LOCK_LEASE_MS,
    } satisfies Lease, name)
  }
  return finished.then(() => acquired)
}

function isLiveLease(value: unknown, now: number): value is Lease {
  if (value === null || typeof value !== 'object') return false
  const lease = value as Partial<Lease>
  return typeof lease.owner === 'string' &&
    typeof lease.expiresAt === 'number' &&
    lease.expiresAt > now
}

function release(database: IDBDatabase, name: string, owner: string): Promise<void> {
  const transaction = database.transaction(LOCK_STORE, 'readwrite')
  const finished = transactionFinished(transaction)
  const store = transaction.objectStore(LOCK_STORE)
  const request = store.get(name)
  request.onsuccess = () => {
    if ((request.result as Lease | undefined)?.owner === owner) store.delete(name)
  }
  return finished
}

function transactionFinished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Release notice lock transaction aborted.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Release notice lock transaction failed.'))
  })
}

function waitForRetry(signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortReason(signal))
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(finish, LOCK_RETRY_MS)
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(abortReason(signal!))
    }
    function finish() {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
  })
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
}
