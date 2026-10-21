import assert from 'node:assert/strict'
import { test } from 'node:test'
import { IDBFactory } from 'fake-indexeddb'
import { createIndexedDbReleaseNoticeLocks } from '../../src/client/release-notes-locks.js'
import type { ReleaseNoticeLocks } from '../../src/client/release-notes-locks.js'

test('an IndexedDB open failure is handled by the first request, not left unhandled after creation', async () => {
  const factory = new IDBFactory()
  const databaseName = `release-notes-open-failure-${Math.random()}`
  const newerDatabase = await openDatabase(factory.open(databaseName, 2))
  const locks = createIndexedDbReleaseNoticeLocks(factory, databaseName)
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)

  try {
    await delay(550)
    assert.deepEqual(unhandled, [])
    await assert.rejects(locks.request('release-notes', () => true), { name: 'VersionError' })
    await delay(0)
    assert.deepEqual(unhandled, [])
  } finally {
    process.off('unhandledRejection', onUnhandled)
    closeLocks(locks)
    newerDatabase.close()
  }
})

test('disposing IndexedDB locks closes the opened database connection', async () => {
  const factory = new IDBFactory()
  const databaseName = `release-notes-dispose-${Math.random()}`
  let closeCount = 0
  const trackedFactory: Pick<IDBFactory, 'open'> = {
    open(name, version) {
      const request = version === undefined ? factory.open(name) : factory.open(name, version)
      return new Proxy(request, {
        get(target, property) {
          return Reflect.get(target, property, target)
        },
        set(target, property, value) {
          if (property === 'onsuccess') {
            target.onsuccess = (event) => {
              const database = target.result
              const close = database.close.bind(database)
              database.close = () => {
                closeCount++
                close()
              }
              value.call(target, event)
            }
            return true
          }
          return Reflect.set(target, property, value, target)
        },
      }) as IDBOpenDBRequest
    },
  }
  const locks = createIndexedDbReleaseNoticeLocks(trackedFactory, databaseName)

  assert.equal(await locks.request('release-notes', () => 'acquired'), 'acquired')
  closeLocks(locks)
  assert.equal(closeCount, 1)
})

test('an abort while IndexedDB is opening returns promptly without running the callback', async () => {
  let request: Partial<IDBOpenDBRequest> = {}
  const factory: Pick<IDBFactory, 'open'> = {
    open() {
      request = {}
      return request as IDBOpenDBRequest
    },
  }
  const locks = createIndexedDbReleaseNoticeLocks(factory, 'release-notes-pending-open')
  const controller = new AbortController()
  let callbacks = 0
  const pending = locks.request('release-notes', { signal: controller.signal }, () => {
    callbacks++
    return true
  })
  controller.abort()

  const outcome = await Promise.race([
    pending.then(() => 'settled', () => 'settled'),
    delay(50).then(() => 'still-waiting'),
  ])
  assert.equal(outcome, 'settled')
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(callbacks, 0)
  closeLocks(locks)
})

test('a second tab recovers a lease after the first holder stops releasing it', async () => {
  const factory = new IDBFactory()
  const databaseName = `release-notes-lease-recovery-${Math.random()}`
  let now = 1_000
  const firstLocks = createIndexedDbReleaseNoticeLocks(factory, databaseName, () => now)
  const secondLocks = createIndexedDbReleaseNoticeLocks(factory, databaseName, () => now)
  let releaseFirst!: () => void
  let markFirstAcquired!: () => void
  const firstAcquired = new Promise<void>((resolve) => { markFirstAcquired = resolve })
  const first = firstLocks.request('release-notes', async () => {
    markFirstAcquired()
    await new Promise<void>((resolve) => { releaseFirst = resolve })
  })

  try {
    await firstAcquired
    now += 30_001
    assert.equal(await secondLocks.request('release-notes', () => 'recovered'), 'recovered')
  } finally {
    releaseFirst()
    await first
    closeLocks(firstLocks)
    closeLocks(secondLocks)
  }
})

function closeLocks(locks: ReleaseNoticeLocks): void {
  const close = (locks as ReleaseNoticeLocks & { close?: () => void }).close
  close?.()
}

function openDatabase(request: IDBOpenDBRequest): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
