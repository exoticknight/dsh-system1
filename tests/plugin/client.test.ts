import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// The client bundle needs a browser host, so check its source: since DSH 0.1.7 each
// remote namespace is its own `remote.<name>` service, and reading one without
// injecting it throws inside Cordis.
test('client injects every remote namespace it calls', () => {
  const source = readFileSync('src/client/index.ts', 'utf8')
  const declared = source.match(/export const inject = \[([^\]]*)\]/)
  assert.ok(declared, 'client inject declaration is missing')
  const inject = new Set(
    [...declared[1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]),
  )
  const used = new Set(
    [...source.matchAll(/\.remote\.([A-Za-z]\w*)/g)].map(
      (match) => `remote.${match[1]}`,
    ),
  )
  assert.ok(used.size > 0)
  for (const service of used)
    assert.ok(inject.has(service), `${service} is used but not injected`)
})
