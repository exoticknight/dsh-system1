import {
  createElement as h,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { SettingsForm, SettingsSecretField } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsFormLabels, SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  addFallbackModel,
  fallbackModelsEqual,
  fallbackModelsInvalidForSave,
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
  fallbackProvider: 'Fallback service',
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
  save: 'Save settings',
  saving: 'Saving…',
  saved: 'Settings saved.',
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
  keySave: 'Save API Key',
  keyClear: 'Clear API Key',
  keySaving: 'Updating credential…',
  keySaved: 'API Key saved.',
  keyCleared: 'API Key cleared.',
  keySaveFailed: 'DSH could not update the credential. Check whether its source is writable.',
  keyRequired: 'Enter an API Key before saving.',
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
  fallbackProvider: '备用服务',
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
  save: '保存设置',
  saving: '保存中…',
  saved: '设置已保存。',
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
  keySave: '保存 API Key',
  keyClear: '清除 API Key',
  keySaving: '正在更新凭据…',
  keySaved: 'API Key 已保存。',
  keyCleared: 'API Key 已清除。',
  keySaveFailed: 'DSH 未能更新凭据，请确认凭据来源是否可写。',
  keyRequired: '请先填写 API Key。',
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

function BundleSettingsPage(props: BoundPageProps) {
  const form = useMemo(() => props.ctx.configForms.get<ConfigValues>('system1'), [props.ctx])
  const subscribe = useCallback((listener: () => void) => form.subscribe(listener), [form])
  const getSnapshot = useCallback(() => form.getSnapshot(), [form])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const value = objectValue(state.value)
  const base = objectValue(state.base)
  const t = props.t
  const [provider, setProvider] = useState('typesafe')
  const [model, setModel] = useState('jev-latest')
  const [fallbackModels, setFallbackModels] = useState<FallbackModelDraft[]>([])
  const [timeout, setTimeout] = useState('800')
  const [resetModel, setResetModel] = useState(false)
  const [resetFallbacks, setResetFallbacks] = useState(false)
  const [resetTimeout, setResetTimeout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const currentModel = objectValue(value.defaultModel)
    setProvider(typeof currentModel.provider === 'string' ? currentModel.provider : 'typesafe')
    setModel(typeof currentModel.model === 'string' ? currentModel.model : 'jev-latest')
    setFallbackModels(readFallbackModels(value.fallbackModels))
    setTimeout(typeof value.timeoutMs === 'number' ? String(value.timeoutMs) : '800')
    setResetModel(false)
    setResetFallbacks(false)
    setResetTimeout(false)
  }, [state.revision, state.status, state.value])

  const pageState = settingsState(t, state.status)
  if (props.view === 'summary') return h('p', null, t('coreSummary'))
  if (pageState) return pageState
  const canSave = state.writable && state.revision !== undefined
  const currentModel = objectValue(value.defaultModel)
  const modelDirty = resetModel ||
    provider !== (typeof currentModel.provider === 'string' ? currentModel.provider : '') ||
    model !== (typeof currentModel.model === 'string' ? currentModel.model : '')
  const currentFallbackModels = readFallbackModels(value.fallbackModels)
  const fallbackDirty = resetFallbacks ||
    !fallbackModelsEqual(fallbackModels, currentFallbackModels)
  const timeoutDirty = resetTimeout ||
    timeout !== String(typeof value.timeoutMs === 'number' ? value.timeoutMs : 800)
  const providerInfo = PROVIDERS.find((candidate) => candidate.id === provider)
  const models = providerInfo?.models ?? []
  const modelIsListed = models.some((candidate) => candidate.id === model)
  const parsedTimeout = Number(timeout)
  const selectionInvalid = !provider.trim() || !model.trim()
  const fallbackInvalid = fallbackModelsInvalidForSave(
    fallbackModels,
    fallbackDirty,
    resetFallbacks,
  )
  const timeoutInvalid = !resetTimeout &&
    (!Number.isInteger(parsedTimeout) || parsedTimeout < 1 || parsedTimeout > 2147483647)
  const validationError = error || (selectionInvalid
    ? t('required')
    : fallbackInvalid ? t('fallbackRequired')
    : timeoutInvalid ? t('invalidTimeout') : '')

  const saveSettings = async () => {
    setNotice('')
    setError('')
    if (!provider.trim() || !model.trim()) {
      setError(t('required'))
      return
    }
    if (fallbackModelsInvalidForSave(
      fallbackModels,
      fallbackDirty,
      resetFallbacks,
    )) {
      setError(t('fallbackRequired'))
      return
    }
    if (!resetTimeout &&
      (!Number.isInteger(parsedTimeout) || parsedTimeout < 1 || parsedTimeout > 2147483647)) {
      setError(t('invalidTimeout'))
      return
    }
    const operations: SettingsPathOpView[] = []
    if (modelDirty) {
      if (resetModel) operations.push({ op: 'unset', path: ['defaultModel'] })
      else operations.push({
        op: 'set',
        path: ['defaultModel'],
        value: { provider: provider.trim(), model: model.trim() },
      })
    }
    if (fallbackDirty) {
      if (resetFallbacks) operations.push({ op: 'unset', path: ['fallbackModels'] })
      else operations.push({
        op: 'set',
        path: ['fallbackModels'],
        value: fallbackModels.map(({ provider, model }) => ({
          provider: provider.trim(),
          model: model.trim(),
        })),
      })
    }
    if (timeoutDirty) {
      if (resetTimeout) operations.push({ op: 'unset', path: ['timeoutMs'] })
      else operations.push({ op: 'set', path: ['timeoutMs'], value: parsedTimeout })
    }
    if (!operations.length || state.revision === undefined) return
    setSaving(true)
    try {
      if (await form.mutate(operations, state.revision)) setNotice(t('saved'))
      else setError(t('saveFailed'))
    } catch {
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const selectProvider = (nextProvider: string) => {
    const nextInfo = PROVIDERS.find((candidate) => candidate.id === nextProvider)
    setProvider(nextProvider)
    setModel(nextInfo?.models[0]?.id ?? '')
    setResetModel(false)
  }
  const baseModel = objectValue(base.defaultModel)
  const resetToModel = () => {
    setProvider(typeof baseModel.provider === 'string' ? baseModel.provider : 'typesafe')
    setModel(typeof baseModel.model === 'string' ? baseModel.model : 'jev-latest')
    setResetModel(true)
  }
  const resetToTimeout = () => {
    setTimeout(typeof base.timeoutMs === 'number' ? String(base.timeoutMs) : '800')
    setResetTimeout(true)
  }
  const resetToFallbackModels = () => {
    setFallbackModels(readFallbackModels(base.fallbackModels))
    setResetFallbacks(true)
  }
  const addFallback = () => {
    const firstProvider = PROVIDERS[0]!
    setFallbackModels(addFallbackModel(fallbackModels, {
      provider: firstProvider.id,
      model: firstProvider.models[0]?.id ?? '',
    }))
    setResetFallbacks(false)
    setError('')
  }
  const changeFallbackProvider = (index: number, nextProvider: string) => {
    const nextInfo = PROVIDERS.find((candidate) => candidate.id === nextProvider)
    setFallbackModels(updateFallbackModel(fallbackModels, index, {
      provider: nextProvider,
      model: nextInfo?.models[0]?.id ?? '',
    }))
    setResetFallbacks(false)
    setError('')
  }
  const changeFallbackModel = (index: number, nextModel: string) => {
    setFallbackModels(updateFallbackModel(fallbackModels, index, { model: nextModel }))
    setResetFallbacks(false)
    setError('')
  }
  const moveFallback = (index: number, offset: -1 | 1) => {
    setFallbackModels(moveFallbackModel(fallbackModels, index, offset))
    setResetFallbacks(false)
    setError('')
  }
  const deleteFallback = (index: number) => {
    setFallbackModels(removeFallbackModel(fallbackModels, index))
    setResetFallbacks(false)
    setError('')
  }
  const formState: SettingsFormShell = {
    available: true,
    writable: canSave,
    dirty: modelDirty || fallbackDirty || timeoutDirty,
    invalid: selectionInvalid || fallbackInvalid || timeoutInvalid,
    saving,
    failed: false,
  }

  return h('section', { className: 'dsh-system1-config' },
    h(SettingsForm, {
      state: formState,
      labels: settingsFormLabels(t),
      onSave: saveSettings,
      onDiscard: () => {},
      children: null,
    },
    field('dsh-system1-provider', t('provider'), h('select', {
      id: 'dsh-system1-provider',
      name: 'provider',
      value: provider,
      disabled: !canSave || saving,
      style: selectStyle,
      onChange: (event: { currentTarget: { value: string } }) => {
        setError('')
        selectProvider(event.currentTarget.value)
      },
    },
    !providerInfo && h('option', { value: provider }, `${t('providerUnknown')}: ${provider}`),
    PROVIDERS.map((entry) => h('option', {
      key: entry.id,
      value: entry.id,
    }, t(entry.label)))), t('defaultHint'), undefined, true),
    field('dsh-system1-model', t('model'), h('select', {
      id: 'dsh-system1-model',
      name: 'model',
      value: model,
      disabled: !canSave || saving || !providerInfo,
      style: selectStyle,
      onChange: (event: { currentTarget: { value: string } }) => {
        setError('')
        setModel(event.currentTarget.value)
      },
    },
    !modelIsListed && model && h('option', { value: model }, model),
    models.map((entry) => h('option', { key: entry.id, value: entry.id },
      entry.label ? t(entry.label) : entry.id))), t('defaultHint'), resetAction(t, t('model'), resetToModel, !canSave || saving)),
    h('section', {
      style: fallbackSectionStyle,
      role: 'group',
      'aria-labelledby': 'dsh-system1-fallbacks-label',
    },
    h('div', { style: settingsFieldHeadStyle },
      h('span', {
        id: 'dsh-system1-fallbacks-label',
        style: settingsLabelStyle,
      }, t('fallbackModels')),
      resetAction(t, t('fallbackModels'), resetToFallbackModels, !canSave || saving)),
    h('p', { style: settingsHintStyle }, t('fallbackHint')),
    fallbackModels.map((fallback, index) => fallbackModelRow(
      t,
      fallback,
      index,
      fallbackModels.length,
      !canSave || saving,
      {
        onProviderChange: changeFallbackProvider,
        onModelChange: changeFallbackModel,
        onMove: moveFallback,
        onRemove: deleteFallback,
      },
    )),
    h('div', null,
      actionButton(t('fallbackAdd'), addFallback, !canSave || saving, 'secondary'))),
    field('dsh-system1-timeout', t('timeout'), h('input', {
      id: 'dsh-system1-timeout',
      name: 'timeoutMs',
      type: 'number',
      min: 1,
      max: 2147483647,
      step: 1,
      value: timeout,
      disabled: !canSave || saving,
      style: inputStyle,
      onChange: (event: { currentTarget: { value: string } }) => {
        setError('')
        setTimeout(event.currentTarget.value)
      },
    }), t('timeoutHint'), resetAction(t, t('timeout'), resetToTimeout, !canSave || saving)),
    h('p', { role: 'note', style: settingsNoteStyle }, t('providerEnabledHint')),
    statusMessage(notice, validationError)),
  )
}

interface FallbackModelRowActions {
  onProviderChange(index: number, provider: string): void
  onModelChange(index: number, model: string): void
  onMove(index: number, offset: -1 | 1): void
  onRemove(index: number): void
}

function fallbackModelRow(
  t: Copy,
  fallback: FallbackModelDraft,
  index: number,
  rowCount: number,
  disabled: boolean,
  actions: FallbackModelRowActions,
) {
  const providerInfo = PROVIDERS.find((candidate) => candidate.id === fallback.provider)
  const models = providerInfo?.models ?? []
  const modelIsListed = models.some((candidate) => candidate.id === fallback.model)
  const serviceId = `dsh-system1-fallback-service-${index}`
  const modelId = `dsh-system1-fallback-model-${index}`
  return h('div', { key: index, style: fallbackRowStyle },
    h('div', { style: fallbackSelectorsStyle },
      h('div', null,
        h('label', {
          htmlFor: serviceId,
          style: settingsHintStyle,
        }, `${t('fallbackProvider')} ${index + 1}`),
        h('select', {
          id: serviceId,
          value: fallback.provider,
          disabled,
          style: selectStyle,
          onChange: (event: { currentTarget: { value: string } }) =>
            actions.onProviderChange(index, event.currentTarget.value),
        },
        h('option', { value: '', disabled: true }, t('fallbackChooseService')),
        !providerInfo && fallback.provider && h('option', { value: fallback.provider },
          `${t('providerUnknown')}: ${fallback.provider}`),
        PROVIDERS.map((entry) => h('option', {
          key: entry.id,
          value: entry.id,
        }, t(entry.label))))),
      h('div', null,
        h('label', {
          htmlFor: modelId,
          style: settingsHintStyle,
        }, `${t('fallbackModel')} ${index + 1}`),
        h('select', {
          id: modelId,
          value: fallback.model,
          disabled: disabled || !providerInfo,
          style: selectStyle,
          onChange: (event: { currentTarget: { value: string } }) =>
            actions.onModelChange(index, event.currentTarget.value),
        },
        h('option', { value: '', disabled: true }, t('fallbackChooseModel')),
        !modelIsListed && fallback.model && h('option', { value: fallback.model }, fallback.model),
        models.map((entry) => h('option', {
          key: entry.id,
          value: entry.id,
        }, entry.label ? t(entry.label) : entry.id))))),
    h('div', { style: fallbackActionsStyle },
      actionButton(t('fallbackUp'), () => actions.onMove(index, -1),
        disabled || index === 0, 'secondary', `${t('fallbackUp')} ${index + 1}`),
      actionButton(t('fallbackDown'), () => actions.onMove(index, 1),
        disabled || index === rowCount - 1, 'secondary', `${t('fallbackDown')} ${index + 1}`),
      actionButton(t('fallbackRemove'), () => actions.onRemove(index),
        disabled, 'secondary', `${t('fallbackRemove')} ${index + 1}`)),
  )
}

function ProviderSettingsPage(props: BoundPageProps & {
  provider: (typeof PROVIDERS)[number]
}) {
  const form = props.form
  const state = form?.state
  const value = objectValue(state?.value)
  const base = objectValue(state?.base)
  const { provider, t } = props
  const [baseURL, setBaseURL] = useState(provider.baseURL)
  const [accountId, setAccountId] = useState(provider.accountId?.defaultValue ?? '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [secret, setSecret] = useState('')
  const [savingSecret, setSavingSecret] = useState(false)
  const [secretNotice, setSecretNotice] = useState('')
  const [secretError, setSecretError] = useState('')
  const [credentialConfigured, setCredentialConfigured] = useState(false)
  const [credentialWritable, setCredentialWritable] = useState(true)
  const [credentialLoading, setCredentialLoading] = useState(true)
  const [credentialAvailable, setCredentialAvailable] = useState(true)
  const credentialGeneration = useRef(0)

  useEffect(() => {
    setBaseURL(typeof value.baseURL === 'string' ? value.baseURL : provider.baseURL)
    const setting = provider.accountId
    setAccountId(setting && typeof value[setting.path] === 'string'
      ? value[setting.path] as string
      : setting?.defaultValue ?? '')
  }, [provider.id, state?.revision, state?.status, state?.value])

  const refreshCredential = useCallback(async () => {
    const generation = ++credentialGeneration.current
    setCredentialLoading(true)
    try {
      const response = await props.ctx.remote.credentials.describe([provider.keyRef])
      if (generation !== credentialGeneration.current) return
      if (!response.ok) {
        setCredentialAvailable(false)
        return
      }
      const credential = response.value[provider.keyRef]
      setCredentialConfigured(credential?.configured ?? false)
      setCredentialWritable(credential?.writable ?? true)
      setCredentialAvailable(true)
    } catch {
      if (generation === credentialGeneration.current) setCredentialAvailable(false)
    } finally {
      if (generation === credentialGeneration.current) setCredentialLoading(false)
    }
  }, [props.ctx, provider.keyRef])

  useEffect(() => {
    void refreshCredential()
    const dispose = props.ctx.remote.$on('credentials/reference-updated', (updatedRef: string) => {
      if (updatedRef === provider.keyRef) void refreshCredential()
    })
    return () => {
      credentialGeneration.current += 1
      dispose()
    }
  }, [props.ctx, provider.keyRef, refreshCredential])

  const pageState = settingsState(t, state?.status)
  if (props.view === 'summary') return h('p', null, t(provider.summary))
  if (pageState) return pageState
  const canSave = Boolean(form && state?.writable && state.revision !== undefined)
  const defaultBaseURL = typeof base.baseURL === 'string' ? base.baseURL
    : provider.baseURL
  const currentBaseURL = typeof value.baseURL === 'string' ? value.baseURL : defaultBaseURL
  const baseURLDirty = baseURL.trim() !== currentBaseURL
  const accountSetting = provider.accountId
  const defaultAccountId = accountSetting
    ? typeof base[accountSetting.path] === 'string'
      ? base[accountSetting.path] as string
      : accountSetting.defaultValue
    : ''
  const currentAccountId = accountSetting && typeof value[accountSetting.path] === 'string'
    ? value[accountSetting.path] as string
    : defaultAccountId
  const normalizedAccountId = accountSetting?.normalize(accountId)
  const accountIdDirty = Boolean(accountSetting && accountId.trim() !== currentAccountId)
  const settingsDirty = baseURLDirty || accountIdDirty
  const normalizedBaseURL = normalizeEndpoint(baseURL)
  const endpointInvalid = baseURLDirty && !normalizedBaseURL
  const accountIdInvalid = Boolean(accountIdDirty && normalizedAccountId === undefined)
  const endpointMessage = error || (endpointInvalid
    ? t('invalidEndpoint')
    : accountIdInvalid ? t('invalidAccountId') : '')

  const saveSettings = async () => {
    setNotice('')
    setError('')
    if (!normalizedBaseURL) {
      setError(t('invalidEndpoint'))
      return
    }
    if (accountIdDirty && normalizedAccountId === undefined) {
      setError(t('invalidAccountId'))
      return
    }
    const operations: SettingsPathOpView[] = []
    if (baseURLDirty)
      operations.push({ op: 'set', path: ['baseURL'], value: normalizedBaseURL })
    if (accountIdDirty && accountSetting && normalizedAccountId !== undefined)
      operations.push({ op: 'set', path: [accountSetting.path], value: normalizedAccountId })
    if (!operations.length || !form || state?.revision === undefined) return
    setSaving(true)
    try {
      if (await form.mutate(operations, state.revision))
        setNotice(t('saved'))
      else setError(t('saveFailed'))
    } catch {
      setError(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveSecret = async () => {
    setSecretNotice('')
    setSecretError('')
    if (!secret.trim()) {
      setSecretError(t('keyRequired'))
      return
    }
    setSavingSecret(true)
    try {
      const response = await props.ctx.remote.credentials.set(provider.keyRef, secret.trim())
      if (!response.ok) setSecretError(t('keySaveFailed'))
      else {
        setSecret('')
        setSecretNotice(t('keySaved'))
        await refreshCredential()
      }
    } catch {
      setSecretError(t('keySaveFailed'))
    } finally {
      setSavingSecret(false)
    }
  }

  const clearSecret = async () => {
    setSecretNotice('')
    setSecretError('')
    setSavingSecret(true)
    try {
      const response = await props.ctx.remote.credentials.unset(provider.keyRef)
      if (!response.ok) setSecretError(t('keySaveFailed'))
      else {
        setSecret('')
        setSecretNotice(t('keyCleared'))
        await refreshCredential()
      }
    } catch {
      setSecretError(t('keySaveFailed'))
    } finally {
      setSavingSecret(false)
    }
  }

  const endpointFormState: SettingsFormShell = {
    available: true,
    writable: canSave,
    dirty: settingsDirty,
    invalid: endpointInvalid || accountIdInvalid,
    saving,
    failed: false,
  }

  return h('section', { className: 'dsh-system1-provider-config', style: providerSettingsStyle },
    h(SettingsForm, {
      state: endpointFormState,
      labels: settingsFormLabels(t),
      onSave: saveSettings,
      onDiscard: () => {},
      children: null,
    },
    field(`dsh-system1-${provider.id}-endpoint`, t(provider.endpointLabel), h('input', {
      id: `dsh-system1-${provider.id}-endpoint`,
      name: 'baseURL',
      type: 'url',
      value: baseURL,
      autoComplete: 'url',
      disabled: !canSave || saving,
      style: inputStyle,
      onChange: (event: { currentTarget: { value: string } }) => {
        setError('')
        setBaseURL(event.currentTarget.value)
      },
    }), t(provider.endpointHint), resetAction(t, t(provider.endpointLabel), () => setBaseURL(defaultBaseURL), !canSave || saving), true),
    accountSetting && field(
      `dsh-system1-${provider.id}-${accountSetting.path}`,
      t(accountSetting.label),
      h('input', {
        id: `dsh-system1-${provider.id}-${accountSetting.path}`,
        name: accountSetting.path,
        type: 'text',
        value: accountId,
        autoComplete: 'off',
        disabled: !canSave || saving,
        style: inputStyle,
        onChange: (event: { currentTarget: { value: string } }) => {
          setError('')
          setAccountId(event.currentTarget.value)
        },
      }),
      t(accountSetting.hint),
      resetAction(t, t(accountSetting.label), () => setAccountId(defaultAccountId), !canSave || saving),
    ),
    statusMessage(notice, endpointMessage)),
    h('section', { style: credentialSectionStyle },
      credentialLoading
        ? h('p', { role: 'status', style: settingsHintStyle }, t('loading'))
        : h(SettingsSecretField, {
          id: `dsh-system1-${provider.id}-api-key`,
          label: t('key'),
          hint: t(provider.keyHint),
          text: secret,
          configured: credentialAvailable && credentialConfigured,
          stateLabel: !credentialAvailable
            ? t('keyStatusUnavailable')
            : credentialConfigured ? t('keyStatusConfigured') : t('keyStatusMissing'),
          disabled: !credentialAvailable || !credentialWritable || savingSecret,
          onEdit: (nextSecret: string) => {
            setSecret(nextSecret)
            setSecretError('')
          },
        }),
      !credentialAvailable && !credentialLoading && h('p', {
        role: 'note', style: settingsHintStyle,
      }, t('keyUnavailable')),
      !credentialWritable && h('p', { role: 'note', style: settingsHintStyle }, t('keyReadOnly')),
      statusMessage(secretNotice, secretError),
      h('div', { style: settingsFooterStyle },
        actionButton(savingSecret ? t('keySaving') : t('keySave'), saveSecret,
          !credentialAvailable || !credentialWritable || credentialLoading || savingSecret || !secret.trim(),
          'primary'),
        actionButton(t('keyClear'), clearSecret,
          !credentialAvailable || !credentialWritable || credentialLoading || savingSecret || !credentialConfigured,
          'secondary'),
      ),
    ),
  )
}

function field(
  id: string,
  label: string,
  control: ReactNode,
  hint: string,
  action?: ReactNode,
  first = false,
) {
  return h('div', { style: first ? { ...settingsFieldStyle, borderTop: 'none' } : settingsFieldStyle },
    h('div', { style: settingsFieldHeadStyle },
      h('label', { htmlFor: id, style: settingsLabelStyle }, label),
      action,
    ),
    control,
    h('p', { style: settingsHintStyle }, hint),
  )
}

/**
 * Mirrors the SettingsForm save button (primitives' settings-form `.save` rule) so every action on
 * these pages shares its font, border box, padding and radius. The shared Button primitive does not
 * inherit the page font and uses different borders and fills, so overriding it inline cannot match.
 */
function actionButton(
  label: string,
  onClick: () => void,
  disabled: boolean,
  variant: 'primary' | 'secondary',
  ariaLabel?: string,
) {
  return h('button', {
    type: 'button',
    disabled,
    onClick,
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
    style: {
      ...actionButtonStyle,
      ...(variant === 'primary' ? primaryActionStyle : secondaryActionStyle),
      ...(disabled ? disabledActionStyle : {}),
    },
  }, label)
}

function resetAction(t: Copy, label: string, onClick: () => void, disabled: boolean) {
  return h('button', {
    type: 'button',
    disabled,
    'aria-label': `${label}: ${t('reset')}`,
    onClick,
    style: resetButtonStyle,
  }, t('reset'))
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

function statusMessage(notice: string, error: string) {
  if (error) return h('p', { role: 'alert', style: errorMessageStyle }, error)
  if (notice) return h('p', { role: 'status', style: successMessageStyle }, notice)
  return null
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

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  height: 34,
  padding: '0 12px',
  border: '0.5px solid var(--dsw-alias-border-l4)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-3)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.5,
}

const selectStyle = {
  minWidth: 0,
  ...inputStyle,
}

const providerSettingsStyle = { display: 'flex', flexDirection: 'column' }
const settingsFieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 0',
  borderTop: '0.5px solid var(--dsw-alias-border-l2)',
}
const fallbackSectionStyle = {
  ...settingsFieldStyle,
  marginTop: 0,
}
const fallbackRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '12px 0',
  borderTop: '0.5px solid var(--dsw-alias-border-l2)',
}
const fallbackSelectorsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
}
const fallbackActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}
const settingsFieldHeadStyle = { display: 'flex', alignItems: 'center', gap: 8 }
const settingsLabelStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
}
const settingsHintStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-tertiary)',
}
const settingsNoteStyle = {
  margin: '12px 0 0',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-secondary)',
}
const resetButtonStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  font: 'inherit',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-secondary)',
  cursor: 'pointer',
}
const settingsFooterStyle = { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16 }
const credentialSectionStyle = {
  marginTop: 16,
  borderTop: '0.5px solid var(--dsw-alias-border-l2)',
  paddingTop: 12,
}
const actionButtonStyle = {
  appearance: 'none',
  border: '1px solid transparent',
  borderRadius: 'var(--dsw-radius-md)',
  padding: '5px 14px',
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.5,
  cursor: 'pointer',
}
const primaryActionStyle = {
  background: 'var(--dsw-alias-label-primary)',
  color: 'var(--dsw-alias-bg-layer-3)',
}
const secondaryActionStyle = {
  borderColor: 'var(--dsw-alias-border-l3)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary)',
}
const disabledActionStyle = { opacity: 0.4, cursor: 'default' }
const errorMessageStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-error)',
}
const successMessageStyle = { ...settingsHintStyle, color: 'var(--dsw-alias-label-secondary)' }
