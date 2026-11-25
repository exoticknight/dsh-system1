import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { OperationCatalogEntry } from '../../src/contracts/operation.js'
import type { SettingsFormScope } from '@deepseek-ai/dsh-client-ui-primitives'
import { previewRoute, routeScope } from '../../src/client/operation-routes.js'
import { providerComponent, providerModels } from '../../src/client/provider-instance.js'
import { projectCatalog } from '../../src/settings-wire.js'

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
  for (const match of source.matchAll(/ctx\.inject\(\['(remote\.[A-Za-z]\w*)'\]/g)) {
    settingsServices.add(match[1]!)
  }
  for (const service of usedRemote)
    assert.ok(settingsServices.has(service), `${service} is used but not deferred for settings`)
  assert.ok(settingsServices.has('configForms'))
  assert.match(source, /slots\.inject\('shell\.overlay'/)
})

const entry: OperationCatalogEntry = {
  id: 'example.locate', version: 1, title: 'Locate',
  inputKinds: [{ id: 'text', title: 'Text' }, { id: 'image', title: 'Image' }],
  route: { enabled: true, fallbackModels: [], version: 1, compatible: true, agentEnabled: false },
  agentAvailable: false,
  providers: [
    { id: 'text', models: { kind: 'deployment', inputs: ['text'] } },
    { id: 'both', models: { kind: 'fixed', models: [
      { id: 'all', aliases: ['current'], inputs: ['text', 'image'] },
    ] } },
  ],
}

test('routing preview honors input support and aliases while keeping saved unavailable candidates out of the effective order', () => {
  const privateDeployment = { provider: 'text', model: 'my-deployment' }
  const mixed = { provider: 'both', model: 'all' }
  const chain = [
    privateDeployment,
    { provider: 'unmounted', model: 'retain-me' },
    { provider: 'both', model: 'current' },
    mixed,
  ]
  assert.deepEqual(
    previewRoute(entry, chain).map(({ candidates }) =>
      candidates.map(({ provider, model }) => ({ provider, model }))),
    [[privateDeployment, mixed], [mixed]],
  )
  assert.equal(chain[1]!.provider, 'unmounted')
})

test('reading the operation form never writes, and saving patches only its edited fields', async () => {
  const calls: unknown[][] = []
  const stored = {
    defaultModel: { provider: 'old', model: 'decision' },
    fallbackModels: [{ provider: 'backup', model: 'keep' }],
    operations: {
      decide: { enabled: false },
      'example.locate': { version: 1, defaultModel: { provider: 'text', model: 'old' }, agentEnabled: true },
      'other.feature': { agentEnabled: true },
    },
  }
  const base: SettingsFormScope<Record<string, unknown>> = {
    getSnapshot: () => ({ status: 'ready', writable: true, revision: 14, value: stored, base: {}, user: stored }),
    subscribe: () => () => {},
    async mutate(...args) { calls.push(args); return true },
  }
  const decide = routeScope(base, 'decide', 1)
  assert.deepEqual(decide.getSnapshot().value, {
    enabled: false, defaultModel: stored.defaultModel, fallbackModels: stored.fallbackModels,
  })
  const locate = routeScope(base, 'example.locate', 2)
  assert.deepEqual(locate.getSnapshot().value, { ...stored.operations['example.locate'], enabled: true })
  assert.deepEqual(calls, [])
  await decide.mutate([{ op: 'set', path: ['enabled'], value: true }], 14)
  await locate.mutate([{ op: 'set', path: ['enabled'], value: false }], 14)
  const route = { provider: 'text', model: 'draft' }
  await routeScope(base, 'example.new', 1).mutate([{ op: 'set', path: ['defaultModel'], value: route }], 14)
  assert.deepEqual(calls, [
    [[{ op: 'set', path: ['operations', 'decide', 'enabled'], value: true }], 14],
    [[{ op: 'set', path: ['operations', 'example.locate', 'enabled'], value: false }], 14],
    [[
      { op: 'set', path: ['operations', 'example.new', 'defaultModel'], value: route },
      { op: 'set', path: ['operations', 'example.new', 'version'], value: 1 },
      { op: 'set', path: ['operations', 'example.new', 'enabled'], value: false },
    ], 14],
  ])
})

test('the wire projection discards implementation and secret state even if included by mistake', () => {
  const binding = { rowId: 'system1-nace', moduleName: 'dsh-system1/providers/nace', providerId: 'private', keyRef: 'REF_ONLY' }
  const supplied = {
    operations: [{ ...entry, providers: [{ ...entry.providers[0], apiKey: 'secret' }] }],
    providerComponents: [{ ...binding, apiKey: 'secret', baseURL: 'https://example.invalid' }],
    internal: { apiKey: 'secret' },
  }
  assert.deepEqual(projectCatalog(supplied), {
    operations: [{ ...entry, providers: [entry.providers[0]] }],
    providerComponents: [binding],
  })
})

test('a provider component shows and configures its own runtime instance instead of the bundled defaults', () => {
  const moduleName = 'dsh-system1/providers/nace'
  const original = { rowId: 'nace-original', moduleName, providerId: 'nace', keyRef: 'NACE_API_KEY' }
  const instance = { rowId: 'system1-nace', moduleName, providerId: 'nace-private', keyRef: 'NACE_PRIVATE_KEY' }
  assert.deepEqual(providerComponent([original, instance], 'system1-nace', moduleName), instance)
  assert.equal(providerComponent([original], 'system1-nace', moduleName), undefined)
  assert.equal(providerComponent([instance, { ...original, providerId: instance.providerId }], 'system1-nace', moduleName), undefined)
  assert.equal(providerComponent([instance, { ...original, rowId: instance.rowId }], 'system1-nace', moduleName), undefined)
  const primary: OperationCatalogEntry = {
    ...entry,
    route: { ...entry.route, defaultModel: { provider: instance.providerId, model: 'current' } },
    providers: [
      { id: 'nace', models: { kind: 'fixed', models: [{ id: 'original-only', inputs: ['image'] }] } },
      { id: instance.providerId, models: { kind: 'fixed', models: [
        { id: 'custom', aliases: ['current'], inputs: ['text'] },
        { id: 'idle', inputs: ['text'] },
      ] } },
    ],
  }
  const secondary: OperationCatalogEntry = {
    ...primary,
    id: 'example.secondary',
    route: {
      ...entry.route,
      enabled: false,
      fallbackModels: [
        { provider: 'nace', model: 'original-only' },
        { provider: instance.providerId, model: 'custom' },
        { provider: instance.providerId, model: 'current' },
      ],
    },
  }
  assert.deepEqual([...providerModels([primary, secondary], instance.providerId).entries()], [
    ['custom', [
      { entry: primary, inputs: ['text'], positions: [{ kind: 'primary' }] },
      { entry: secondary, inputs: ['text'], positions: [{ kind: 'fallback', index: 2 }, { kind: 'fallback', index: 3 }] },
    ]],
    ['idle', [
      { entry: primary, inputs: ['text'], positions: [] },
      { entry: secondary, inputs: ['text'], positions: [] },
    ]],
  ])
})
