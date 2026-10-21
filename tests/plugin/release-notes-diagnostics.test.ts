import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createReleaseNoticeReporter } from '../../src/client/release-notes-diagnostics.js'

test('automatic release-notice diagnostics deduplicate by reason while manual failures always log', () => {
  const messages: string[] = []
  const report = createReleaseNoticeReporter((message) => messages.push(message))
  const storageUnavailable = { status: 'skipped', reason: 'storage-unavailable' } as const
  const automaticFailure = (error: string) => ({ status: 'skipped', reason: 'failed', error } as const)

  report(storageUnavailable, true)
  report(storageUnavailable, true)
  report(automaticFailure('first automatic failure'), true)
  report(automaticFailure('second automatic failure'), true)
  report(automaticFailure('manual failure'), false)
  report(automaticFailure('manual failure'), false)
  report({ status: 'shown', persisted: false }, true)
  report({ status: 'shown', persisted: false }, false)

  assert.deepEqual(messages, [
    'Automatic update notice skipped because browser storage is unavailable.',
    'Release notice could not be shown: first automatic failure',
    'Release notice could not be shown: manual failure',
    'Release notice could not be shown: manual failure',
    'The notice was shown, but its display marker could not be saved.',
    'The notice was shown, but its display marker could not be saved.',
  ])
})
