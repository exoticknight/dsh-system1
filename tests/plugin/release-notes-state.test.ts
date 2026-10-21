import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory } from 'fake-indexeddb'
import { groupReleaseNoticeHighlights } from '../../src/client/release-notes-groups.js'
import { resolveReleaseNoticeLocks } from '../../src/client/release-notes-locks.js'
import type { ReleaseNoticeLocks } from '../../src/client/release-notes-locks.js'
import {
  presentReleaseNotice,
  RELEASE_NOTICE_LOCK_NAME,
  RELEASE_NOTICE_STORAGE_KEY,
} from '../../src/client/release-notes-state.js'
import type { ReleaseNoticeStorage } from '../../src/client/release-notes-state.js'

Object.assign(globalThis, { __DSH_SYSTEM1_RELEASE_NOTICE_JSON__: '{}' })
const {
  acquireReleaseNotesOverlayController,
  onManualReleaseNotesRequest,
  requestManualReleaseNotes,
} = await import(
  '../../src/client/release-notes.js'
)

class MemoryStorage implements ReleaseNoticeStorage {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function createLocks(): ReleaseNoticeLocks {
  let tail = Promise.resolve()
  return {
    request<T>(name: string, optionsOrCallback: unknown, maybeCallback?: () => T | PromiseLike<T>) {
      const callback = typeof optionsOrCallback === 'function'
        ? optionsOrCallback as () => T | PromiseLike<T>
        : maybeCallback!
      const previous = tail
      let release!: () => void
      tail = new Promise<void>((resolve) => { release = resolve })
      return previous.then(async () => {
        try {
          assert.equal(name, RELEASE_NOTICE_LOCK_NAME)
          return await callback()
        } finally {
          release()
        }
      })
    },
  } as unknown as ReleaseNoticeLocks
}

test('same-origin concurrent tabs only present an automatic notice once', async () => {
  const storage = new MemoryStorage()
  const locks = createLocks()
  let presentations = 0
  const options = {
    noticeId: '0.3.0',
    automatic: true,
    storage,
    locks,
    present: async () => {
      presentations++
      assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), null)
      await new Promise((resolve) => setTimeout(resolve, 5))
      return true
    },
  }

  const attempts = await Promise.all([
    presentReleaseNotice(options),
    presentReleaseNotice(options),
  ])

  assert.equal(presentations, 1)
  assert.deepEqual(attempts.map(({ status }) => status).sort(), ['shown', 'skipped'])
  assert.equal(storage.values.size, 1)
  assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), '0.3.0')
})

test('each changed notice id replaces the one stored marker; returning to an old id can show again', async () => {
  const storage = new MemoryStorage()
  const locks = createLocks()
  const present = async () => true
  const show = (noticeId: string) => presentReleaseNotice({
    noticeId,
    automatic: true,
    storage,
    locks,
    present,
  })

  assert.equal((await show('0.3.0')).status, 'shown')
  assert.deepEqual(await show('0.3.0'), { status: 'skipped', reason: 'already-shown' })
  assert.equal((await show('0.4.0')).status, 'shown')
  assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), '0.4.0')
  assert.equal((await show('0.3.0')).status, 'shown')
  assert.equal(storage.values.size, 1)
})

test('storage failure suppresses automatic presentation but does not block manual viewing', async () => {
  const brokenStorage: ReleaseNoticeStorage = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  let presentations = 0
  const present = () => { presentations++; return true }

  const automatic = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: true,
    storage: brokenStorage,
    locks: createLocks(),
    present,
  })
  assert.deepEqual(automatic, { status: 'skipped', reason: 'storage-unavailable' })
  assert.equal(presentations, 0)

  const manual = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: false,
    storage: brokenStorage,
    present,
  })
  assert.deepEqual(manual, { status: 'shown', persisted: false })
  assert.equal(presentations, 1)
})

test('automatic presentation is coordinated by IndexedDB when Web Locks are unavailable', async () => {
  const storage = new MemoryStorage()
  const locks = resolveReleaseNoticeLocks(undefined, new IDBFactory())!
  let presentations = 0
  const options = {
    noticeId: '0.3.0',
    automatic: true,
    storage,
    locks,
    present: async () => {
      presentations++
      assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), null)
      await new Promise((resolve) => setTimeout(resolve, 5))
      return true
    },
  }

  const attempts = await Promise.all([
    presentReleaseNotice(options),
    presentReleaseNotice(options),
  ])

  assert.equal(presentations, 1)
  assert.deepEqual(attempts.map(({ status }) => status).sort(), ['shown', 'skipped'])
  assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), '0.3.0')
})

test('automatic presentation is skipped when no cross-tab lock provider is available', async () => {
  const storage = new MemoryStorage()
  let presentations = 0
  const result = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: true,
    storage,
    present: () => { presentations++; return true },
  })

  assert.deepEqual(result, { status: 'skipped', reason: 'lock-unavailable' })
  assert.equal(presentations, 0)
  assert.equal(storage.values.size, 0)
})

test('manual viewing always presents the current notice even after its id was recorded', async () => {
  const storage = new MemoryStorage()
  storage.setItem(RELEASE_NOTICE_STORAGE_KEY, '0.3.0')
  let presentations = 0
  const result = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: false,
    storage,
    locks: createLocks(),
    present: () => { presentations++; return true },
  })

  assert.deepEqual(result, { status: 'shown', persisted: true })
  assert.equal(presentations, 1)
  assert.equal(storage.values.size, 1)
})

test('manual requests without a mounted overlay are ignored rather than replayed later', () => {
  requestManualReleaseNotes()
  let requests = 0
  const dispose = onManualReleaseNotesRequest(() => { requests++ })
  try {
    assert.equal(requests, 0)
    requestManualReleaseNotes()
    assert.equal(requests, 1)
  } finally {
    dispose()
  }
})

test('only one release-notes overlay controller can register a manual request listener', () => {
  const releaseFirst = acquireReleaseNotesOverlayController()
  assert.equal(typeof releaseFirst, 'function')
  let presentations = 0
  const disposeManualListener = onManualReleaseNotesRequest(() => { presentations++ })
  const releaseSecond = acquireReleaseNotesOverlayController()
  const disposeSecondListener = releaseSecond === undefined
    ? undefined
    : onManualReleaseNotesRequest(() => { presentations++ })

  try {
    assert.equal(releaseSecond, undefined)
    requestManualReleaseNotes()
    assert.equal(presentations, 1)
  } finally {
    disposeSecondListener?.()
    disposeManualListener()
    releaseFirst?.()
  }

  const releaseNext = acquireReleaseNotesOverlayController()
  assert.equal(typeof releaseNext, 'function')
  releaseNext?.()
})

test('a cancelled presentation does not consume the notice id', async () => {
  const storage = new MemoryStorage()
  const controller = new AbortController()
  const result = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: true,
    storage,
    locks: createLocks(),
    signal: controller.signal,
    present: () => {
      controller.abort()
      return false
    },
  })

  assert.deepEqual(result, { status: 'skipped', reason: 'cancelled' })
  assert.equal(storage.values.size, 0)
})

test('a failed mount is distinct from cancellation and does not consume the notice id', async () => {
  const storage = new MemoryStorage()
  const result = await presentReleaseNotice({
    noticeId: '0.3.0',
    automatic: true,
    storage,
    locks: createLocks(),
    present: () => false,
  })

  assert.deepEqual(result, { status: 'skipped', reason: 'failed' })
  assert.equal(storage.values.size, 0)
})

test('a temporarily lost presentation slot is reported separately so automatic display can retry', async () => {
  const storage = new MemoryStorage()
  const options = {
    noticeId: '0.3.0',
    automatic: true,
    storage,
    locks: createLocks(),
    present: () => 'slot-lost' as const,
  }

  assert.deepEqual(await presentReleaseNotice(options), { status: 'skipped', reason: 'slot-lost' })
  assert.equal(storage.values.size, 0)
  assert.deepEqual(await presentReleaseNotice({ ...options, present: () => true }), {
    status: 'shown',
    persisted: true,
  })
  assert.equal(storage.getItem(RELEASE_NOTICE_STORAGE_KEY), '0.3.0')
})

test('migration highlights are grouped before ordinary release note categories', () => {
  const groups = groupReleaseNoticeHighlights([
    { kind: 'added', title: 'Image input' },
    { kind: 'fixed', title: 'A bug fix' },
    { kind: 'migration', title: 'Configuration change' },
    { kind: 'improved', title: 'A behavior change' },
  ])

  assert.deepEqual(groups.map(({ kind }) => kind), [
    'migration',
    'added',
    'improved',
    'fixed',
  ])
  assert.deepEqual(groups[0]?.highlights.map(({ title }) => title), ['Configuration change'])
})
