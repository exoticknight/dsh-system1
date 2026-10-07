import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addFallbackModel,
  fallbackModelsValid,
  moveFallbackModel,
  readFallbackModels,
  removeFallbackModel,
  updateFallbackModel,
} from '../../src/client/fallback-models.js'

test('fallback settings preserve configured rows and surface malformed values', () => {
  assert.deepEqual(
    readFallbackModels([
      { provider: 'laya', model: 'auto' },
      null,
      { provider: 'typesafe', model: 3 },
    ]),
    [
      { provider: 'laya', model: 'auto' },
      { provider: '', model: '' },
      { provider: 'typesafe', model: '' },
    ],
  )
})

test('fallback settings require a service and model but allow an empty or duplicate list', () => {
  assert.equal(fallbackModelsValid([]), true)
  assert.equal(
    fallbackModelsValid([
      { provider: 'typesafe', model: 'jev-latest' },
      { provider: 'typesafe', model: 'jev-latest' },
    ]),
    true,
  )
  assert.equal(fallbackModelsValid([{ provider: ' ', model: 'jev-latest' }]), false)
  assert.equal(fallbackModelsValid([{ provider: 'laya', model: '' }]), false)
})

test('fallback rows can be added, changed, reordered, and removed immutably', () => {
  const initial = [{ provider: 'typesafe', model: 'jev-latest' }]
  const added = addFallbackModel(initial, {
    provider: 'laya',
    model: 'auto',
  })
  const updated = updateFallbackModel(added, 0, {
    provider: 'cloudflare',
    model: 'clef-flash',
  })

  assert.deepEqual(initial, [{ provider: 'typesafe', model: 'jev-latest' }])
  assert.deepEqual(
    moveFallbackModel(updated, 1, -1),
    [
      { provider: 'laya', model: 'auto' },
      { provider: 'cloudflare', model: 'clef-flash' },
    ],
  )
  assert.deepEqual(removeFallbackModel(updated, 0), [
    { provider: 'laya', model: 'auto' },
  ])
})
