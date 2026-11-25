import * as z from 'zod/mini'
import type { InvocationDescriptor, TypertRemoteContribution, RemoteStreamHandle } from '@deepseek-ai/dsh-typert-protocol'
import type { OperationCatalog } from './contracts/operation.js'

export interface ProviderComponentBinding {
  readonly rowId: string
  readonly moduleName: string
  readonly providerId: string
  /** Reference name only, never the credential value. */
  readonly keyRef: string
}

export interface SettingsCatalog extends OperationCatalog {
  readonly providerComponents?: readonly ProviderComponentBinding[]
}

const id = z.string()
const reference = z.object({ provider: id, model: id })
const inputKind = z.object({
  id, title: id, translations: z.optional(z.record(id, id)),
})
const model = z.object({ id, aliases: z.optional(z.array(id)), inputs: z.array(id) })
const provider = z.object({
  id,
  models: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('fixed'), models: z.array(model) }),
    z.object({ kind: z.literal('deployment'), inputs: z.array(id) }),
  ]),
})
const catalog = z.object({
  providerComponents: z.optional(z.array(z.object({
    rowId: id, moduleName: id, providerId: id, keyRef: id,
  }))),
  operations: z.array(z.object({
    id,
    version: z.number(),
    title: id,
    description: z.optional(id),
    translations: z.optional(z.record(id, z.object({ title: id, description: z.optional(id) }))),
    inputKinds: z.array(inputKind),
    tool: z.optional(z.object({ name: id, description: id })),
    route: z.object({
      enabled: z.boolean(),
      defaultModel: z.optional(reference),
      fallbackModels: z.array(reference),
      agentEnabled: z.boolean(),
      version: z.number(),
      compatible: z.boolean(),
    }),
    agentAvailable: z.boolean(),
    providers: z.array(provider),
  })),
})

export const SETTINGS_SERVICE = 'system1Settings' as const
const PACKAGE = 'dsh-system1'
const descriptor: InvocationDescriptor = {
  id: `${PACKAGE}#${SETTINGS_SERVICE}/watch`,
  service: SETTINGS_SERVICE,
  namespace: SETTINGS_SERVICE,
  method: 'watch',
  mode: 'stream',
  invocation: { kind: 'direct' },
  parameters: [],
  cancellation: { parameter: 'signal' },
  result: {
    mode: 'strict',
    typeSymbol: `${PACKAGE}#${SETTINGS_SERVICE}/watch:result`,
    create: () => catalog,
  },
}

// The loader supports this small, hand-written contribution. Both sides share the
// same descriptor; the only remote surface is a read-only, whitelisted snapshot.
export const settingsRemote: TypertRemoteContribution = { package: PACKAGE, descriptors: [descriptor] }
export const settingsHost = {
  package: PACKAGE,
  face: 'host' as const,
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: settingsRemote.descriptors,
}

export function projectCatalog(value: unknown): SettingsCatalog {
  // Optional properties have no wire key. Strip any others that an upstream
  // implementation may accidentally include in its directory projection.
  return JSON.parse(JSON.stringify(catalog.parse(value))) as SettingsCatalog
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    system1Settings: { watch(signal?: AbortSignal): RemoteStreamHandle<SettingsCatalog, never> }
  }
}
