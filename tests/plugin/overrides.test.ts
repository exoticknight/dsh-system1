import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultAware, overriddenAgainstDefault } from '../../src/client/overrides.js'

const text = {
  field: 'baseURL',
  format: (value: unknown) => typeof value === 'string' ? value : '',
  parse: (input: string) =>
    input.trim() === '' ? { kind: 'clear' as const } : { kind: 'set' as const, value: input.trim() },
}
const list = {
  field: 'fallbackModels',
  format: (value: unknown) => JSON.stringify(Array.isArray(value) ? value : []),
  parse: (input: string) => ({ kind: 'set' as const, value: JSON.parse(input) as unknown }),
}

test('a value equal to the package default is not an override', () => {
  assert.equal(overriddenAgainstDefault(
    { text: 'https://a', overridden: true, invalid: false }, text, 'https://a'), false)
  assert.equal(overriddenAgainstDefault(
    { text: 'https://b', overridden: true, invalid: false }, text, 'https://a'), true)
})

test('a field without a package default never shows an override', () => {
  assert.equal(overriddenAgainstDefault(
    { text: 'abc', overridden: true, invalid: false }, text, undefined), false)
  assert.equal(overriddenAgainstDefault(
    { text: 'abc', overridden: true, invalid: false }, text, ''), false)
  assert.equal(overriddenAgainstDefault(
    { text: '[{"provider":"laya","model":"auto"}]', overridden: true, invalid: false }, list, []), false)
})

test('an unset or cleared field is not an override', () => {
  assert.equal(overriddenAgainstDefault(
    { text: 'https://b', overridden: false, invalid: false }, text, 'https://a'), false)
})

test('choosing the default value again clears the stored override', () => {
  const spec = defaultAware(text, () => 'https://a')
  assert.deepEqual(spec.parse('https://a'), { kind: 'clear' })
  assert.deepEqual(spec.parse('https://b'), { kind: 'set', value: 'https://b' })
  assert.deepEqual(defaultAware(list, () => []).parse('[]'), { kind: 'clear' })
  assert.deepEqual(defaultAware(text, () => undefined).parse('x'), { kind: 'set', value: 'x' })
})
