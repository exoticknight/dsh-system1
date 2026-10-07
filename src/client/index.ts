import {
  createElement as h,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import {
  Button,
  IconChevronDownOutlineRegular,
  IconChevronUpOutlineRegular,
  IconPlusOutlineRegular,
  IconTrashOutlineRegular,
  SettingsForm,
  SettingsFormModel,
  SettingsSecretField,
  SettingsValueField,
  Tag,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  SettingsFieldSpec,
  SettingsFieldState,
  SettingsFormLabels,
  SettingsFormScope,
  SettingsFormShell,
  SettingsSecretSpec,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  addFallbackModel,
  fallbackModelsValid,
  moveFallbackModel,
  readFallbackModels,
  removeFallbackModel,
  updateFallbackModel,
} from './fallback-models.js'
import type { FallbackModelDraft } from './fallback-models.js'

const NS = 'dsh-system1'
const PACKAGE = 'dsh-system1'

const en = {
  coreSummary: 'Choose a default model and ordered fallbacks, then set the shared request timeout.',
  provider: 'Default service',
  providerTypesafe: 'TypeSafe (Jev)',
  providerLaya: 'Laya',
  providerCloudflare: 'Cloudflare Clef',
  providerUnknown: 'Unsupported service',
  model: 'Default model',
  fallbackModels: 'Fallback models',
  fallbackHint: 'Tried in order when the default model fails.',
  fallbackRequired: 'Choose a service and model for each fallback.',
  fallbackModel: 'Fallback model',
  fallbackChooseService: 'Choose a service',
  fallbackChooseModel: 'Choose a model',
  fallbackAdd: 'Add fallback model',
  fallbackUp: 'Move up',
  fallbackDown: 'Move down',
  fallbackRemove: 'Remove',
  timeout: 'Request timeout (ms)',
  defaultHint: 'Used when a decision request does not specify a model.',
  timeoutHint: 'Applies when a decision request does not provide its own timeout.',
  providerEnabledHint: 'Enable the matching service component in the list below.',
  reset: 'Reset to package default',
  overridden: 'Overridden',
  save: 'Save settings',
  saving: 'Saving…',
  saveFailed: 'DSH did not accept these settings. Check the values and try again.',
  loading: 'Loading settings…',
  unavailable: 'Settings are unavailable while this component is not loaded.',
  readOnly: 'This DSH profile does not allow settings changes.',
  required: 'Choose a service and model.',
  invalidTimeout: 'Enter a whole number from 1 to 2147483647.',
  key: 'API Key',
  keyHint: 'Stored in DSH credentials and never shown here. Leave blank to keep the saved key.',
  layaKeyHint: 'Optional for a local Laya server without authentication. If LAYA_API_KEY is set, enter that key. Leave blank to keep the saved key.',
  keyStatusConfigured: 'Configured',
  keyStatusMissing: 'Not configured',
  keyStatusUnavailable: 'Unavailable',
  keyReadOnly: 'The current credential source is read-only.',
  keyUnavailable: 'The DSH credential service is unavailable.',
  typesafeSummary: 'Configure the TypeSafe endpoint and its API Key.',
  layaSummary: 'Configure the Laya endpoint and optional API Key.',
  typesafeEndpoint: 'TypeSafe API base URL',
  typesafeEndpointHint: 'The TypeSafe System One endpoint is appended automatically.',
  layaEndpoint: 'Laya server base URL',
  layaEndpointHint: 'Use the base URL of a Laya server exposing POST /v1/systemone.',
  cloudflareSummary: 'Configure the Cloudflare API endpoint, account, and API token.',
  cloudflareEndpoint: 'Cloudflare API base URL',
  cloudflareEndpointHint: 'Use the Cloudflare API v4 base URL.',
  cloudflareAccountId: 'Cloudflare account ID',
  cloudflareAccountIdHint: 'Enter the 32-character account ID, or leave blank to use CLOUDFLARE_ACCOUNT_ID.',
  invalidEndpoint: 'Enter a full HTTP or HTTPS URL.',
  invalidAccountId: 'Enter a 32-character Cloudflare account ID, or leave it blank to use the environment variable.',
  modelAuto: 'Auto route by language',
  modelEnglish: 'English checkpoint',
  modelMultilingual: 'Multilingual checkpoint',
  modelTypedDecisions: 'Typed-decisions checkpoint',
}

const zh = {
  coreSummary: '选择默认模型和按顺序尝试的备用模型，并设置通用请求超时。',
  provider: '默认服务',
  providerTypesafe: 'TypeSafe（Jev）',
  providerLaya: 'Laya',
  providerCloudflare: 'Cloudflare Clef',
  providerUnknown: '暂不支持的服务',
  model: '默认模型',
  fallbackModels: '备用模型',
  fallbackHint: '默认模型失败时按顺序依次尝试。',
  fallbackRequired: '请为每个备用项选择服务和模型。',
  fallbackModel: '备用模型',
  fallbackChooseService: '选择服务',
  fallbackChooseModel: '选择模型',
  fallbackAdd: '添加备用模型',
  fallbackUp: '上移',
  fallbackDown: '下移',
  fallbackRemove: '删除',
  timeout: '请求超时（毫秒）',
  defaultHint: '决策请求未指定模型时使用。',
  timeoutHint: '决策请求没有单独指定超时时使用。',
  providerEnabledHint: '请在下方组件列表中启用对应的服务组件。',
  reset: '恢复默认值',
  overridden: '已覆盖',
  save: '保存设置',
  saving: '保存中…',
  saveFailed: 'DSH 未接受这些设置，请检查数值后重试。',
  loading: '正在读取设置…',
  unavailable: '组件未加载时无法读取设置。',
  readOnly: '当前 DSH 配置文件不允许修改设置。',
  required: '请选择服务和模型。',
  invalidTimeout: '请输入 1 到 2147483647 之间的整数。',
  key: 'API Key',
  keyHint: '密钥保存在 DSH 凭据存储中，页面不会读取；留空会保留已保存的密钥。',
  layaKeyHint: '本地 Laya 未启用鉴权时可留空；配置了 LAYA_API_KEY 时需要填写。密钥不会回显，留空会保留已保存值。',
  keyStatusConfigured: '已配置',
  keyStatusMissing: '未配置',
  keyStatusUnavailable: '暂不可用',
  keyReadOnly: '当前凭据来源为只读。',
  keyUnavailable: 'DSH 凭据服务暂不可用。',
  typesafeSummary: '配置 TypeSafe 接口地址和 API Key。',
  layaSummary: '配置 Laya 接口地址和可选 API Key。',
  typesafeEndpoint: 'TypeSafe API 根地址',
  typesafeEndpointHint: '插件会自动在地址后拼接 TypeSafe System One 接口路径。',
  layaEndpoint: 'Laya 服务根地址',
  layaEndpointHint: '填写提供 POST /v1/systemone 接口的 Laya 服务根地址。',
  cloudflareSummary: '配置 Cloudflare API 地址、账号和 API Token。',
  cloudflareEndpoint: 'Cloudflare API 根地址',
  cloudflareEndpointHint: '填写 Cloudflare API v4 根地址。',
  cloudflareAccountId: 'Cloudflare 账号 ID',
  cloudflareAccountIdHint: '填写 32 位账号 ID；留空时使用环境变量 CLOUDFLARE_ACCOUNT_ID。',
  invalidEndpoint: '请输入完整的 HTTP 或 HTTPS 地址。',
  invalidAccountId: '请输入 32 位 Cloudflare 账号 ID，或留空以使用环境变量。',
  modelAuto: '按语言自动路由',
  modelEnglish: '英文模型',
  modelMultilingual: '多语言模型',
  modelTypedDecisions: '类型化决策模型',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-system1': keyof typeof en
  }
}

type Copy = Translate<keyof typeof en>
type PageProps = PluginConfigViewProps & { t: Copy }
type BoundPageProps = PageProps & { ctx: Context }
type ConfigValues = Record<string, unknown>
type ProviderId = 'typesafe' | 'laya' | 'cloudflare'
type ModelOption = { id: string; label?: keyof typeof en }
type ProviderSettings = {
  id: ProviderId
  rowId: string
  label: keyof typeof en
  summary: keyof typeof en
  keyRef: string
  keyHint: keyof typeof en
  endpointLabel: keyof typeof en
  endpointHint: keyof typeof en
  baseURL: string
  models: ReadonlyArray<ModelOption>
  accountId?: {
    path: 'accountId'
    label: keyof typeof en
    hint: keyof typeof en
    defaultValue: string
    normalize: (value: string) => string | undefined
  }
}

const PROVIDERS: ReadonlyArray<ProviderSettings> = [
  {
    id: 'typesafe',
    rowId: 'system1-typesafe',
    label: 'providerTypesafe',
    summary: 'typesafeSummary',
    keyRef: 'TYPESAFE_API_KEY',
    keyHint: 'keyHint',
    endpointLabel: 'typesafeEndpoint',
    endpointHint: 'typesafeEndpointHint',
    baseURL: 'https://api.typesafe.ai',
    models: [{ id: 'jev-latest' }, { id: 'jev-preview' }, { id: 'jev-1.13.0' }],
  },
  {
    id: 'laya',
    rowId: 'system1-laya',
    label: 'providerLaya',
    summary: 'layaSummary',
    keyRef: 'LAYA_API_KEY',
    keyHint: 'layaKeyHint',
    endpointLabel: 'layaEndpoint',
    endpointHint: 'layaEndpointHint',
    baseURL: 'http://127.0.0.1:8000',
    models: [
      { id: 'auto', label: 'modelAuto' },
      { id: 'english', label: 'modelEnglish' },
      { id: 'multilingual', label: 'modelMultilingual' },
      { id: 'typed-decisions', label: 'modelTypedDecisions' },
    ],
  },
  {
    id: 'cloudflare',
    rowId: 'system1-cloudflare',
    label: 'providerCloudflare',
    summary: 'cloudflareSummary',
    keyRef: 'CLOUDFLARE_API_TOKEN',
    keyHint: 'keyHint',
    endpointLabel: 'cloudflareEndpoint',
    endpointHint: 'cloudflareEndpointHint',
    baseURL: 'https://api.cloudflare.com/client/v4',
    models: [{ id: 'clef' }, { id: 'clef-flash' }],
    accountId: {
      path: 'accountId',
      label: 'cloudflareAccountId',
      hint: 'cloudflareAccountIdHint',
      defaultValue: '',
      normalize: normalizeCloudflareAccountId,
    },
  },
]

export const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'configForms']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-system1 client copy')
  ctx.effect(
    () =>
      ctx.slots.inject('plugins.bundle.config', () =>
        ctx.slots.register(
          { name: 'plugins.bundle.config', key: PACKAGE, locale: NS },
          (props: PageProps) => h(BundleSettingsPage, { ...props, ctx }),
        ),
      ),
    'dsh-system1 bundle settings page',
  )
  for (const provider of PROVIDERS) {
    ctx.effect(
      () =>
        ctx.slots.inject('plugins.row.config', () =>
          ctx.slots.register(
            { name: 'plugins.row.config', key: `${PACKAGE}#${provider.rowId}`, locale: NS },
            (props: PageProps) => h(ProviderSettingsPage, { ...props, ctx, provider }),
          ),
        ),
      `dsh-system1 ${provider.id} settings page`,
    )
  }
}

type FieldStates = Record<string, SettingsFieldState>
type FormView = { shell: SettingsFormShell; fields: FieldStates }
type FormStore = {
  getSnapshot(): FormView
  subscribe(listener: () => void): () => void
}

/** One native SettingsFormModel per page: staged edits, override tags, resets and a single save. */
function useSettingsForm(
  scope: SettingsFormScope<ConfigValues>,
  specs: SettingsFieldSpec[],
  secrets: SettingsSecretSpec[] = [],
) {
  const model = useMemo(() => new SettingsFormModel(scope, specs, secrets), [scope, specs, secrets])
  useEffect(() => () => model.dispose(), [model])
  const store = useMemo(() => model.bind((): FormView => ({
    shell: model.shell(),
    fields: Object.fromEntries(
      [...specs, ...secrets].map(({ field }) => [field, model.field(field)]),
    ),
  })) as unknown as FormStore, [model, specs, secrets])
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store])
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])
  const view = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const actions = useMemo(() => model.actions(), [model])
  return { view, actions }
}

function useConfigScope(ctx: Context, entryId: string) {
  const scope = useMemo(() => ctx.configForms.get<ConfigValues>(entryId), [ctx, entryId])
  const subscribe = useCallback((listener: () => void) => scope.subscribe(listener), [scope])
  const getStatus = useCallback(() => scope.getSnapshot().status, [scope])
  const status = useSyncExternalStore(subscribe, getStatus, getStatus)
  return { scope: scope as unknown as SettingsFormScope<ConfigValues>, status }
}

const defaultModelSpec: SettingsFieldSpec = {
  field: 'defaultModel',
  format: (value) => {
    const row = objectValue(value)
    return typeof row.provider === 'string' && typeof row.model === 'string'
      ? JSON.stringify({ provider: row.provider, model: row.model })
      : ''
  },
  parse: (text) => {
    if (text === '') return { kind: 'clear' }
    const row = parseModelRow(text)
    return row ? { kind: 'set', value: row } : undefined
  },
}

const fallbackModelsSpec: SettingsFieldSpec = {
  field: 'fallbackModels',
  format: (value) => JSON.stringify(readFallbackModels(value)),
  parse: (text) => {
    const rows = readFallbackModels(parseJson(text))
    if (!fallbackModelsValid(rows)) return undefined
    return {
      kind: 'set',
      value: rows.map(({ provider, model }) => ({ provider: provider.trim(), model: model.trim() })),
    }
  },
}

const timeoutSpec: SettingsFieldSpec = {
  field: 'timeoutMs',
  format: (value) => typeof value === 'number' ? String(value) : '',
  parse: (text) => {
    const trimmed = text.trim()
    if (trimmed === '') return { kind: 'clear' }
    const parsed = Number(trimmed)
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 2147483647
      ? { kind: 'set', value: parsed }
      : undefined
  },
}

const BUNDLE_SPECS = [defaultModelSpec, fallbackModelsSpec, timeoutSpec]
const NO_SECRETS: SettingsSecretSpec[] = []

function BundleSettingsPage(props: BoundPageProps) {
  const { t } = props
  const { scope, status } = useConfigScope(props.ctx, 'system1')
  if (props.view === 'summary') return h('p', null, t('coreSummary'))
  return settingsState(t, status) ?? h(BundleSettingsForm, { t, scope })
}

function BundleSettingsForm(props: { t: Copy; scope: SettingsFormScope<ConfigValues> }) {
  const { t } = props
  const { view, actions } = useSettingsForm(props.scope, BUNDLE_SPECS, NO_SECRETS)
  const disabled = !view.shell.writable || view.shell.saving
  const defaultField = view.fields.defaultModel!
  const defaultRow = parseModelRow(defaultField.text) ?? { provider: '', model: '' }
  const fallbackField = view.fields.fallbackModels!
  const fallbacks = readFallbackModels(parseJson(fallbackField.text))
  const timeoutField = view.fields.timeoutMs!
  const editFallbacks = (rows: FallbackModelDraft[]) =>
    actions.edit('fallbackModels', JSON.stringify(rows))
  const firstProvider = PROVIDERS[0]!

  return h(SettingsForm, {
    labels: settingsFormLabels(t),
    state: view.shell,
    onSave: actions.save,
    onDiscard: actions.discard,
    children: [
      h(SelectField, {
        key: 'default',
        id: 'dsh-system1-default-model',
        label: t('model'),
        hint: t('defaultHint'),
        overridden: defaultField.overridden,
        invalid: defaultField.invalid,
        invalidLabel: t('required'),
        disabled,
        t,
        onReset: () => actions.resetField('defaultModel'),
      }, modelSelectors(t, 'dsh-system1-default', defaultRow, disabled, defaultField.invalid,
        (row) => actions.edit('defaultModel', JSON.stringify(row)))),
      h(SelectField, {
        key: 'fallbacks',
        id: 'dsh-system1-fallback-models',
        label: t('fallbackModels'),
        hint: t('fallbackHint'),
        overridden: fallbackField.overridden,
        invalid: fallbackField.invalid,
        invalidLabel: t('fallbackRequired'),
        disabled,
        t,
        onReset: () => actions.resetField('fallbackModels'),
      },
      fallbacks.map((row, index) => h('div', { key: index, style: fallbackRowStyle },
        modelSelectors(t, `dsh-system1-fallback-${index}`, row, disabled, fallbackField.invalid,
          (next) => editFallbacks(updateFallbackModel(fallbacks, index, next))),
        h(Button, {
          variant: 'ghost', size: 'sm', icon: h(IconChevronUpOutlineRegular, { size: 13 }),
          disabled: disabled || index === 0,
          'aria-label': `${t('fallbackUp')} ${index + 1}`, title: t('fallbackUp'),
          onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, -1)),
        }),
        h(Button, {
          variant: 'ghost', size: 'sm', icon: h(IconChevronDownOutlineRegular, { size: 13 }),
          disabled: disabled || index === fallbacks.length - 1,
          'aria-label': `${t('fallbackDown')} ${index + 1}`, title: t('fallbackDown'),
          onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, 1)),
        }),
        h(Button, {
          variant: 'ghost', size: 'sm', icon: h(IconTrashOutlineRegular, { size: 13 }),
          disabled,
          'aria-label': `${t('fallbackRemove')} ${index + 1}`, title: t('fallbackRemove'),
          onClick: () => editFallbacks(removeFallbackModel(fallbacks, index)),
        }))),
      h('div', null, h(Button, {
        variant: 'outline', size: 'sm', icon: h(IconPlusOutlineRegular, { size: 13 }),
        disabled,
        onClick: () => editFallbacks(addFallbackModel(fallbacks, {
          provider: firstProvider.id,
          model: firstProvider.models[0]?.id ?? '',
        })),
      }, t('fallbackAdd')))),
      h(SettingsValueField, {
        key: 'timeout',
        id: 'dsh-system1-timeout',
        label: t('timeout'),
        hint: t('timeoutHint'),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidTimeout'),
        numeric: true,
        disabled: !view.shell.writable,
        ...timeoutField,
        onEdit: (text: string) => actions.edit('timeoutMs', text),
        onReset: () => actions.resetField('timeoutMs'),
      }),
      h('p', { key: 'note', style: settingsHintStyle }, t('providerEnabledHint')),
    ],
  })
}

function modelSelectors(
  t: Copy,
  idPrefix: string,
  row: FallbackModelDraft,
  disabled: boolean,
  invalid: boolean,
  onChange: (row: FallbackModelDraft) => void,
) {
  const info = PROVIDERS.find((candidate) => candidate.id === row.provider)
  const models = info?.models ?? []
  const listed = models.some((candidate) => candidate.id === row.model)
  const invalidProps = invalid ? { 'aria-invalid': true } : {}
  return [
    h('select', {
      key: 'provider',
      id: `${idPrefix}-provider`,
      'aria-label': t('provider'),
      value: row.provider,
      disabled,
      style: selectStyle,
      ...invalidProps,
      onChange: (event: { currentTarget: { value: string } }) => {
        const provider = event.currentTarget.value
        const next = PROVIDERS.find((candidate) => candidate.id === provider)
        onChange({ provider, model: next?.models[0]?.id ?? '' })
      },
    },
    h('option', { value: '', disabled: true }, t('fallbackChooseService')),
    !info && row.provider && h('option', { value: row.provider }, `${t('providerUnknown')}: ${row.provider}`),
    PROVIDERS.map((entry) => h('option', { key: entry.id, value: entry.id }, t(entry.label)))),
    h('select', {
      key: 'model',
      id: `${idPrefix}-model`,
      'aria-label': t('fallbackModel'),
      value: row.model,
      disabled: disabled || !info,
      style: selectStyle,
      ...invalidProps,
      onChange: (event: { currentTarget: { value: string } }) =>
        onChange({ ...row, model: event.currentTarget.value }),
    },
    h('option', { value: '', disabled: true }, t('fallbackChooseModel')),
    !listed && row.model && h('option', { value: row.model }, row.model),
    models.map((entry) => h('option', { key: entry.id, value: entry.id },
      entry.label ? t(entry.label) : entry.id))),
  ]
}

/**
 * The native SettingsValueField layout (label, override tag with reset, hint or invalid message)
 * around select controls, which the primitives do not provide. Styles copy fields.module.css.
 */
function SelectField(props: {
  id: string
  label: string
  hint: string
  overridden: boolean
  invalid: boolean
  invalidLabel: string
  disabled: boolean
  t: Copy
  onReset: () => void
  children?: ReactNode
}) {
  return h('div', { role: 'group', 'aria-labelledby': `${props.id}-label`, style: fieldStyle },
    h('div', { style: fieldHeadStyle },
      h('span', { id: `${props.id}-label`, style: fieldLabelStyle }, props.label),
      props.overridden && h('span', { style: fieldBadgesStyle },
        h(Tag, { tone: 'neutral' }, props.t('overridden')),
        h('button', {
          type: 'button',
          style: fieldResetStyle,
          disabled: props.disabled,
          onClick: props.onReset,
        }, props.t('reset')))),
    h('div', { style: selectStackStyle }, props.children),
    h('p', { style: props.invalid ? fieldInvalidStyle : settingsHintStyle },
      props.invalid ? props.invalidLabel : props.hint),
  )
}

function ProviderSettingsPage(props: BoundPageProps & { provider: ProviderSettings }) {
  const { t, provider } = props
  const { scope, status } = useConfigScope(props.ctx, provider.rowId)
  if (props.view === 'summary') return h('p', null, t(provider.summary))
  return settingsState(t, status) ??
    h(ProviderSettingsForm, { t, provider, scope, ctx: props.ctx })
}

function ProviderSettingsForm(props: {
  t: Copy
  provider: ProviderSettings
  scope: SettingsFormScope<ConfigValues>
  ctx: Context
}) {
  const { t, provider, ctx } = props
  const [credential, setCredential] = useState({ available: true, configured: false, writable: true })
  const refresh = useCallback(async () => {
    try {
      const response = await ctx.remote.credentials.describe([provider.keyRef])
      if (!response.ok) {
        setCredential((current) => ({ ...current, available: false }))
        return
      }
      const info = response.value[provider.keyRef]
      setCredential({
        available: true,
        configured: info?.configured ?? false,
        writable: info?.writable ?? true,
      })
    } catch {
      setCredential((current) => ({ ...current, available: false }))
    }
  }, [ctx, provider.keyRef])
  useEffect(() => {
    void refresh()
    return ctx.remote.$on('credentials/reference-updated', (ref: string) => {
      if (ref === provider.keyRef) void refresh()
    })
  }, [ctx, provider.keyRef, refresh])
  const specs = useMemo(
    () => provider.accountId ? [endpointSpec, accountIdSpec] : [endpointSpec],
    [provider],
  )
  const secrets = useMemo((): SettingsSecretSpec[] => [{
    field: 'apiKey',
    write: async (text) => {
      const response = await ctx.remote.credentials.set(provider.keyRef, text)
      await refresh()
      return response.ok
    },
  }], [ctx, provider.keyRef, refresh])
  const { view, actions } = useSettingsForm(props.scope, specs, secrets)
  const disabled = !view.shell.writable
  const accountId = provider.accountId
  return h(SettingsForm, {
    labels: settingsFormLabels(t),
    state: view.shell,
    onSave: actions.save,
    onDiscard: actions.discard,
    children: [
      h(SettingsSecretField, {
        key: 'key',
        id: `dsh-system1-${provider.id}-api-key`,
        label: t('key'),
        hint: !credential.available ? t('keyUnavailable')
          : !credential.writable ? t('keyReadOnly') : t(provider.keyHint),
        disabled: !credential.available || !credential.writable,
        text: view.fields.apiKey!.text,
        configured: credential.available && credential.configured,
        stateLabel: !credential.available ? t('keyStatusUnavailable')
          : credential.configured ? t('keyStatusConfigured') : t('keyStatusMissing'),
        onEdit: (text: string) => actions.edit('apiKey', text),
      }),
      h(SettingsValueField, {
        key: 'endpoint',
        id: `dsh-system1-${provider.id}-endpoint`,
        label: t(provider.endpointLabel),
        hint: t(provider.endpointHint),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidEndpoint'),
        placeholder: provider.baseURL,
        disabled,
        ...view.fields.baseURL!,
        onEdit: (text: string) => actions.edit('baseURL', text),
        onReset: () => actions.resetField('baseURL'),
      }),
      accountId && h(SettingsValueField, {
        key: 'account',
        id: `dsh-system1-${provider.id}-${accountId.path}`,
        label: t(accountId.label),
        hint: t(accountId.hint),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidAccountId'),
        disabled,
        ...view.fields[accountId.path]!,
        onEdit: (text: string) => actions.edit(accountId.path, text),
        onReset: () => actions.resetField(accountId.path),
      }),
    ],
  })
}

const endpointSpec: SettingsFieldSpec = {
  field: 'baseURL',
  format: (value) => typeof value === 'string' ? value : '',
  parse: (text) => {
    if (text.trim() === '') return { kind: 'clear' }
    const normalized = normalizeEndpoint(text)
    return normalized ? { kind: 'set', value: normalized } : undefined
  },
}

const accountIdSpec: SettingsFieldSpec = {
  field: 'accountId',
  format: (value) => typeof value === 'string' ? value : '',
  parse: (text) => {
    const normalized = normalizeCloudflareAccountId(text)
    if (normalized === undefined) return undefined
    return normalized === '' ? { kind: 'clear' } : { kind: 'set', value: normalized }
  },
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function parseModelRow(text: string): FallbackModelDraft | undefined {
  const row = objectValue(parseJson(text))
  return typeof row.provider === 'string' && row.provider.trim() !== '' &&
    typeof row.model === 'string' && row.model.trim() !== ''
    ? { provider: row.provider.trim(), model: row.model.trim() }
    : undefined
}

function settingsFormLabels(t: Copy): SettingsFormLabels {
  return {
    unavailable: t('unavailable'),
    readOnly: t('readOnly'),
    saveFailed: t('saveFailed'),
    save: t('save'),
    saving: t('saving'),
  }
}

function settingsState(t: Copy, status: string | undefined) {
  if (status === 'loading') return h('p', { role: 'status', style: settingsHintStyle }, t('loading'))
  if (status === 'unavailable' || status === undefined)
    return h('p', { role: 'note', style: settingsHintStyle }, t('unavailable'))
  return null
}

function objectValue(value: unknown): ConfigValues {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as ConfigValues
    : {}
}

function normalizeEndpoint(value: string): string | undefined {
  const normalized = value.trim().replace(/\/+$/u, '')
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return normalized
  } catch {
    return undefined
  }
  return undefined
}

function normalizeCloudflareAccountId(value: string): string | undefined {
  const normalized = value.trim()
  return normalized.length === 0 || normalized.length === 32
    ? normalized
    : undefined
}

// Copies of the primitives' settings-form fields.module.css rules, for the select fields only.
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' }
const fieldHeadStyle = { display: 'flex', alignItems: 'center', gap: 8 }
const fieldLabelStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
}
const fieldBadgesStyle = { display: 'inline-flex', alignItems: 'center', gap: 8 }
const fieldResetStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  font: 'inherit',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
}
const fieldInvalidStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-state-error-primary)',
}
const selectStyle = {
  boxSizing: 'border-box',
  flex: 1,
  minWidth: 0,
  height: 34,
  padding: '0 12px',
  border: '0.5px solid var(--dsw-alias-border-l4)',
  borderRadius: 'var(--dsw-radius-md)',
  background: 'var(--dsw-alias-bg-layer-3)',
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
}
const selectStackStyle = { display: 'flex', flexDirection: 'column', gap: 8 }
const fallbackRowStyle = { display: 'flex', alignItems: 'center', gap: 8 }
const settingsHintStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-tertiary)',
}
