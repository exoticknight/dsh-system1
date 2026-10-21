import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// The browser notice must boot with only slots/locale. Settings services are
// awaited separately so a delayed config or credentials provider cannot block it.
test('release notice boots independently from settings services', () => {
  const source = readFileSync('src/client/index.ts', 'utf8')
  const boot = source.match(/export const inject = \[([^\]]*)\]/)
  assert.ok(boot, 'client inject declaration is missing')
  const bootServices = new Set(
    [...boot[1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]),
  )
  assert.deepEqual([...bootServices], ['slots', 'locale'])

  const settings = source.match(/ctx\.inject\(\[([^\]]*)\], registerSettingsPages\)/)
  assert.ok(settings, 'settings page services must be injected separately')
  const settingsServices = new Set(
    [...settings[1]!.matchAll(/'([^']+)'/g)].map((match) => match[1]),
  )
  const usedRemote = new Set(
    [...source.matchAll(/\.remote\.([A-Za-z]\w*)/g)].map(
      (match) => `remote.${match[1]}`,
    ),
  )
  assert.ok(usedRemote.size > 0)
  for (const service of usedRemote)
    assert.ok(settingsServices.has(service), `${service} is used but not deferred for settings`)
  assert.ok(settingsServices.has('configForms'))
  assert.match(source, /slots\.inject\('shell\.overlay'/)
})
