import { RELEASE_NOTICE_LOCK_NAME } from './release-notes-locks.js'
import type { ReleaseNoticeLocks } from './release-notes-locks.js'

export const RELEASE_NOTICE_STORAGE_KEY = 'dsh-system1:release-notes:lastShownNoticeId'
export { RELEASE_NOTICE_LOCK_NAME } from './release-notes-locks.js'

export type ReleaseNoticeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type ReleaseNoticeAttempt =
  | { status: 'shown'; persisted: boolean }
  | {
      status: 'skipped'
      reason: 'already-shown' | 'storage-unavailable' | 'lock-unavailable' | 'slot-lost' | 'cancelled' | 'failed'
      error?: unknown
    }

type PresentReleaseNoticeOptions = {
  noticeId: string
  automatic: boolean
  storage?: ReleaseNoticeStorage
  locks?: ReleaseNoticeLocks
  signal?: AbortSignal
  present: () => boolean | 'slot-lost' | Promise<boolean | 'slot-lost'>
}

/** Serialize every automatic and manual presentation across tabs of the same origin. */
export async function presentReleaseNotice({
  noticeId,
  automatic,
  storage,
  locks,
  signal,
  present,
}: PresentReleaseNoticeOptions): Promise<ReleaseNoticeAttempt> {
  const run = async (): Promise<ReleaseNoticeAttempt> => {
    if (signal?.aborted) return { status: 'skipped', reason: 'cancelled' }

    if (automatic) {
      if (storage === undefined) return { status: 'skipped', reason: 'storage-unavailable' }
      const previous = readLastShown(storage)
      if (!previous.ok) return { status: 'skipped', reason: 'storage-unavailable' }
      if (previous.noticeId === noticeId) return { status: 'skipped', reason: 'already-shown' }
      if (!probeStorage(storage)) return { status: 'skipped', reason: 'storage-unavailable' }
    }

    let mounted: boolean | 'slot-lost'
    try {
      mounted = await present()
    } catch (error) {
      return { status: 'skipped', reason: 'failed', error }
    }
    if (mounted === 'slot-lost') return { status: 'skipped', reason: 'slot-lost' }
    if (!mounted) {
      if (signal?.aborted) return { status: 'skipped', reason: 'cancelled' }
      return {
        status: 'skipped',
        reason: 'failed',
        error: new Error('Release notice dialog did not mount.'),
      }
    }

    return {
      status: 'shown',
      persisted: storage !== undefined && writeLastShown(storage, noticeId),
    }
  }

  if (locks === undefined) {
    return automatic
      ? { status: 'skipped', reason: 'lock-unavailable' }
      : run()
  }

  let callbackStarted = false
  try {
    const callback = () => {
      callbackStarted = true
      return run()
    }
    return signal === undefined
      ? await locks.request(RELEASE_NOTICE_LOCK_NAME, callback)
      : await locks.request(RELEASE_NOTICE_LOCK_NAME, { signal }, callback)
  } catch (error) {
    if (signal?.aborted) return { status: 'skipped', reason: 'cancelled' }
    if (!automatic && !callbackStarted) return run()
    return { status: 'skipped', reason: 'failed', error }
  }
}

function readLastShown(storage: ReleaseNoticeStorage):
  | { ok: true; noticeId: string | null }
  | { ok: false } {
  try {
    return { ok: true, noticeId: storage.getItem(RELEASE_NOTICE_STORAGE_KEY) }
  } catch {
    return { ok: false }
  }
}

function probeStorage(storage: ReleaseNoticeStorage): boolean {
  const probeValue = 'dsh-system1:release-notes:storage-probe'
  let previous: string | null
  try {
    previous = storage.getItem(RELEASE_NOTICE_STORAGE_KEY)
    storage.setItem(RELEASE_NOTICE_STORAGE_KEY, previous ?? probeValue)
    if (previous === null) storage.removeItem(RELEASE_NOTICE_STORAGE_KEY)
    return true
  } catch {
    try {
      if (storage.getItem(RELEASE_NOTICE_STORAGE_KEY) === probeValue)
        storage.removeItem(RELEASE_NOTICE_STORAGE_KEY)
    } catch {
      // A failed probe remains a failed probe; the automatic prompt stays closed.
    }
    return false
  }
}

function writeLastShown(storage: ReleaseNoticeStorage, noticeId: string): boolean {
  try {
    storage.setItem(RELEASE_NOTICE_STORAGE_KEY, noticeId)
    return true
  } catch {
    return false
  }
}
