import {
  createElement as h,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { LIQUID_BASE_URL } from '../providers/liquid/models.js'
import type { OperationCatalogEntry } from '../contracts/operation.js'
import { projectCatalog, settingsRemote } from '../settings-wire.js'
import type { SettingsCatalog } from '../settings-wire.js'
import { describeCandidate, previewRoute, routeScope } from './operation-routes.js'
import { providerComponent, providerModels } from './provider-instance.js'
import {
  Button,
  IconInfoOutlineRegular,
  IconChevronDownOutlineRegular,
  IconChevronUpOutlineRegular,
  IconPlusOutlineRegular,
  IconTrashOutlineRegular,
  Menu,
  SegmentedTabs,
  SettingsForm,
  SettingsFormModel,
  SettingsSecretField,
  SettingsValueField,
  Switch,
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
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
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
import { overriddenAgainstDefault } from './overrides.js'
import { ReleaseNotesOverlay } from './release-notes-overlay.js'
import { requestManualReleaseNotes } from './release-notes.js'

const NS = 'dsh-system1'
const PACKAGE = 'dsh-system1'

const en = {
  coreSummary: 'Choose a default model and ordered fallbacks, then configure each provider below.',
  provider: 'Provider',
  providerTypesafe: 'TypeSafe (Jev)',
  providerLaya: 'Laya',
  providerMeraGpt: 'meraGPT',
  providerLiquid: 'Liquid AI',
  providerNace: 'Nace.AI Drex',
  providerCloudflare: 'Cloudflare Clef',
  providerUnknown: 'Unavailable provider',
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
  timeout: 'Provider timeout (ms)',
  defaultHint: 'Used when a decision request does not specify a model.',
  operationDefaultHint: 'Used when the caller does not specify a model.',
  operationDirectory: 'Operations',
  providerInstanceId: 'Instance ID',
  providerModels: 'Models and capabilities',
  providerModelsUnavailable: 'No models are registered for this instance.',
  providerInstanceUnavailable: 'The running provider instance is unavailable.',
  routePreview: 'Routing by input',
  emptyRoute: 'Not configured',
  directoryUnavailable: 'The live provider directory is unavailable. Reconnecting…',
  noProviders: 'Enable a provider component below to see its models here.',
  crossProviderWarning: 'If a request falls back to another provider, that provider may receive the same input.',
  unavailableModel: 'Unavailable',
  chooseDeployment: 'Deployment name',
  declaredSupport: 'Declared support',
  modelSupports: 'Supports: {inputs}',
  modelRoutePrimary: '{operation} · Primary model',
  modelRouteFallback: '{operation} · Fallback {index}',
  unusedModel: 'Not selected',
  connectionSettings: 'Connection settings',
  agentTool: 'Agent tool',
  agentToolEnabled: 'Available to the agent',
  agentToolDisabled: 'Off',
  agentToolUnavailable: 'Enabled in settings · main model unavailable',
  agentToolUnmounted: 'Enabled in settings · tool not registered',
  agentToolNeedsPrimary: 'Choose an available main model before turning on the Agent tool.',
  agentToolLegacy: 'Manage the decision tool in the component list below.',
  agentToolFeatureOff: 'Operation off · tool preference retained',
  featureEnable: 'Enable {operation}',
  featureSwitchHelp: 'Takes effect when you save. Turning it off keeps your model and Agent settings.',
  featureOff: 'This operation is off. The route stays saved but does not run.',
  routeVersionMismatch: 'This saved route belongs to a different feature version. Review the models before saving a route for this version.',
  clearModel: 'Clear main model',
  timeoutTypesafeHint: 'Applies when a request has no timeout. Leave blank to use TypeSafe’s 800 ms default.',
  timeoutLayaHint: 'Applies when a request has no timeout. Leave blank to use Laya’s 800 ms default.',
  timeoutMeraGptHint: 'Applies when a request has no timeout. Leave blank to use meraGPT’s 10,000 ms default.',
  timeoutNaceHint: 'Applies when a request has no timeout. Leave blank to use Nace’s 60,000 ms default.',
  timeoutCloudflareHint: 'Applies when a request has no timeout. Leave blank to use Cloudflare’s 800 ms default.',
  feedbackPrompt: 'Need help or a provider/model you would like to use?',
  providerFeedbackPrompt: 'Having trouble configuring this provider?',
  reportIssue: 'Report a problem',
  requestProvider: 'Request a provider',
  requestModel: 'Request a model',
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
  liquidSummary: 'Configure Liquid AI and its API Key.',
  liquidEndpoint: 'Liquid AI API base URL',
  liquidEndpointHint: 'Include /decisions in the base URL. The plugin appends /v1/systemone.',
  timeoutLiquidHint: 'Leave blank to use Liquid AI’s 10,000 ms default.',
  meragptSummary: 'Configure meraGPT and its API Key.',
  naceSummary: 'Configure Nace.AI Drex and its API Key.',
  typesafeEndpoint: 'TypeSafe API base URL',
  typesafeEndpointHint: 'The TypeSafe System One endpoint is appended automatically.',
  layaEndpoint: 'Laya server base URL',
  layaEndpointHint: 'Use the base URL of a Laya server exposing POST /v1/systemone.',
  meragptEndpoint: 'meraGPT API base URL',
  meragptEndpointHint: 'Use the meraGPT API root; POST /v1/systemone is appended automatically.',
  naceEndpoint: 'Nace API base URL',
  naceEndpointHint: 'Enter the Nace API root. The plugin adds /v1/systemone for Decision, /v1/locate for text Locate, or /v1/box for image Locate.',
  naceImageRetentionHint: 'For Drex Max decisions above the 4 MiB request limit, the plugin may upload some images as temporary files. DSH attempts deletion after each call; Nace keeps uploads for 24 hours by default, and backup removal can take up to 35 days. Image Locate sends its image inline.',
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
  releaseLanguage: 'en',
  releaseMigration: 'Migration notes',
  releaseTitle: "System1 · What's New",
  releaseEntry: 'Release notes',
  releaseAdded: 'New',
  releaseImproved: 'Improved',
  releaseFixed: 'Fixed',
  releaseClose: 'Close',
  releaseLink: 'Full release notes',
  releaseAcknowledge: 'Got it',
}

const zh = {
  coreSummary: '选择默认模型和按顺序尝试的备用模型，再到下方配置各 provider。',
  provider: '服务商',
  providerTypesafe: 'TypeSafe（Jev）',
  providerLaya: 'Laya',
  providerMeraGpt: 'meraGPT',
  providerLiquid: 'Liquid AI',
  providerNace: 'Nace.AI Drex',
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
  timeout: 'Provider 超时（毫秒）',
  defaultHint: '决策请求未指定模型时使用。',
  operationDefaultHint: '调用方未指定模型时使用。',
  operationDirectory: '操作',
  providerInstanceId: '实例 ID',
  providerModels: '模型与能力',
  providerModelsUnavailable: '当前实例未注册模型。',
  providerInstanceUnavailable: '暂无法读取正在运行的服务商实例。',
  routePreview: '各类输入的路由顺序',
  emptyRoute: '未配置',
  directoryUnavailable: '暂时无法读取运行时目录，正在重新连接…',
  noProviders: '启用下方相应的服务组件后，可在这里查看模型。',
  crossProviderWarning: '切换到其他服务商兜底时，该服务商可能接收同一份输入。',
  unavailableModel: '不可用',
  chooseDeployment: '部署名称',
  declaredSupport: '声明支持',
  modelSupports: '支持：{inputs}',
  modelRoutePrimary: '{operation} · 主模型',
  modelRouteFallback: '{operation} · 备用 {index}',
  unusedModel: '未被选用',
  connectionSettings: '连接设置',
  agentTool: 'Agent 工具',
  agentToolEnabled: 'Agent 可调用',
  agentToolDisabled: '关闭',
  agentToolUnavailable: '配置已开启 · 主模型不可用',
  agentToolUnmounted: '配置已开启 · 工具尚未注册',
  agentToolNeedsPrimary: '请选择可用的主模型，再开启 Agent 工具。',
  agentToolLegacy: '请在下方组件列表中管理原有决策工具。',
  agentToolFeatureOff: '操作已关闭 · 工具偏好保留',
  featureEnable: '启用{operation}',
  featureSwitchHelp: '保存设置后生效。关闭会保留模型和 Agent 工具设置。',
  featureOff: '此操作已关闭。已保存的路由不会执行。',
  routeVersionMismatch: '已保存的路由属于其他版本。请核对所选模型，再保存当前版本的路由。',
  clearModel: '清除主模型',
  timeoutTypesafeHint: '请求未单独指定超时时使用。留空采用 TypeSafe 默认值 800 毫秒。',
  timeoutLayaHint: '请求未单独指定超时时使用。留空采用 Laya 默认值 800 毫秒。',
  timeoutMeraGptHint: '请求未单独指定超时时使用。留空采用 meraGPT 默认值 10,000 毫秒。',
  timeoutNaceHint: '请求未单独指定超时时使用。留空采用 Nace 默认值 60,000 毫秒。',
  timeoutCloudflareHint: '请求未单独指定超时时使用。留空采用 Cloudflare 默认值 800 毫秒。',
  feedbackPrompt: '遇到问题，或缺少想用的提供商/模型？',
  providerFeedbackPrompt: '配置此提供商时遇到问题？',
  reportIssue: '反馈问题',
  requestProvider: '请求接入提供商',
  requestModel: '请求添加模型',
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
  liquidSummary: '配置 Liquid AI 服务和 API Key。',
  liquidEndpoint: 'Liquid AI API 根地址',
  liquidEndpointHint: '根地址包含 /decisions；插件会自动拼接 /v1/systemone。',
  timeoutLiquidHint: '留空使用 Liquid AI 的 10,000 ms 默认值。',
  meragptSummary: '配置 meraGPT 服务和 API Key。',
  naceSummary: '配置 Nace.AI Drex 服务和 API Key。',
  typesafeEndpoint: 'TypeSafe API 根地址',
  typesafeEndpointHint: '插件会自动在地址后拼接 TypeSafe System One 接口路径。',
  layaEndpoint: 'Laya 服务根地址',
  layaEndpointHint: '填写提供 POST /v1/systemone 接口的 Laya 服务根地址。',
  meragptEndpoint: 'meraGPT API 根地址',
  meragptEndpointHint: '填写 meraGPT API 根地址；插件会自动拼接 POST /v1/systemone。',
  naceEndpoint: 'Nace API 根地址',
  naceEndpointHint: '填写 Nace API 根地址。决策使用 /v1/systemone，文本定位使用 /v1/locate，图片定位使用 /v1/box。',
  naceImageRetentionHint: 'Drex Max 决策请求超过 4 MiB 时，插件可能将部分图片作为临时文件上传。DSH 会在调用后尝试删除；Nace 默认保留上传文件 24 小时，备份最长可能需要 35 天清除。图片定位在请求中直接传图。',
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
  releaseLanguage: 'zh',
  releaseMigration: '迁移说明',
  releaseTitle: 'System1 · 更新内容',
  releaseEntry: '更新内容',
  releaseAdded: '新增',
  releaseImproved: '改进',
  releaseFixed: '修复',
  releaseClose: '关闭',
  releaseLink: '完整发布说明',
  releaseAcknowledge: '知道了',
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
type ProviderId = 'typesafe' | 'laya' | 'meragpt' | 'nace' | 'cloudflare' | 'liquid'
type ProviderSettings = {
  id: ProviderId
  rowId: string
  label: keyof typeof en
  summary: keyof typeof en
  keyHint: keyof typeof en
  endpointLabel: keyof typeof en
  endpointHint: keyof typeof en
  timeoutHint: keyof typeof en
  baseURL: string
  note?: keyof typeof en
  accountId?: {
    path: 'accountId'
    label: keyof typeof en
    hint: keyof typeof en
  }
}

const LAYA_MODEL_LABELS: Readonly<Record<string, keyof typeof en>> = {
  auto: 'modelAuto',
  english: 'modelEnglish',
  multilingual: 'modelMultilingual',
  'typed-decisions': 'modelTypedDecisions',
}

const PROVIDERS: ReadonlyArray<ProviderSettings> = [
  {
    id: 'typesafe',
    rowId: 'system1-typesafe',
    label: 'providerTypesafe',
    summary: 'typesafeSummary',
    keyHint: 'keyHint',
    endpointLabel: 'typesafeEndpoint',
    endpointHint: 'typesafeEndpointHint',
    timeoutHint: 'timeoutTypesafeHint',
    baseURL: 'https://api.typesafe.ai',
  },
  {
    id: 'laya',
    rowId: 'system1-laya',
    label: 'providerLaya',
    summary: 'layaSummary',
    keyHint: 'layaKeyHint',
    endpointLabel: 'layaEndpoint',
    endpointHint: 'layaEndpointHint',
    timeoutHint: 'timeoutLayaHint',
    baseURL: 'http://127.0.0.1:8000',
  },
  {
    id: 'nace',
    rowId: 'system1-nace',
    label: 'providerNace',
    summary: 'naceSummary',
    keyHint: 'keyHint',
    endpointLabel: 'naceEndpoint',
    endpointHint: 'naceEndpointHint',
    timeoutHint: 'timeoutNaceHint',
    baseURL: 'https://console.nace.ai',
    note: 'naceImageRetentionHint',
  },
  {
    id: 'meragpt',
    rowId: 'system1-meragpt',
    label: 'providerMeraGpt',
    summary: 'meragptSummary',
    keyHint: 'keyHint',
    endpointLabel: 'meragptEndpoint',
    endpointHint: 'meragptEndpointHint',
    timeoutHint: 'timeoutMeraGptHint',
    baseURL: 'https://meragpt.com',
  },
  {
    id: 'liquid',
    rowId: 'system1-liquid',
    label: 'providerLiquid',
    summary: 'liquidSummary',
    keyHint: 'keyHint',
    endpointLabel: 'liquidEndpoint',
    endpointHint: 'liquidEndpointHint',
    timeoutHint: 'timeoutLiquidHint',
    baseURL: LIQUID_BASE_URL,
  },
  {
    id: 'cloudflare',
    rowId: 'system1-cloudflare',
    label: 'providerCloudflare',
    summary: 'cloudflareSummary',
    keyHint: 'keyHint',
    endpointLabel: 'cloudflareEndpoint',
    endpointHint: 'cloudflareEndpointHint',
    timeoutHint: 'timeoutCloudflareHint',
    baseURL: 'https://api.cloudflare.com/client/v4',
    accountId: {
      path: 'accountId',
      label: 'cloudflareAccountId',
      hint: 'cloudflareAccountIdHint',
    },
  },
]

export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-system1 client copy')
  const releaseNotesLogger = ctx.logger('dsh-system1 release notes')
  const reportReleaseNoteIssue = (message: string) => releaseNotesLogger.warn(message)
  ctx.effect(
    () =>
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'dsh-system1.release-notes', locale: NS },
          (props: { t: Copy }) => h(ReleaseNotesOverlay, {
            ...props,
            log: reportReleaseNoteIssue,
          }),
        ),
      ),
    'dsh-system1 release notes overlay',
  )

  ctx.inject(['remote', 'remote.credentials', 'configForms'], registerSettingsPages)
}

function registerSettingsPages(ctx: Context): void {
  ctx.effect(
    async () => await ctx.remote.$mount(settingsRemote),
    'dsh-system1 settings directory Remote',
  )
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
  const baseOf = useCallback(
    (field: string) => objectValue(scope.getSnapshot().base)[field],
    [scope],
  )
  const model = useMemo(
    () => new SettingsFormModel(scope, specs, secrets),
    [scope, specs, secrets],
  )
  useEffect(() => () => model.dispose(), [model])
  const store = useMemo(() => model.bind((): FormView => ({
    shell: model.shell(),
    fields: Object.fromEntries([
      ...specs.map((spec) => {
        const state = model.field(spec.field)
        return [spec.field, {
          ...state,
          overridden: overriddenAgainstDefault(state, spec, baseOf(spec.field)),
        }]
      }),
      ...secrets.map(({ field }) => [field, model.field(field)]),
    ]),
  })) as unknown as FormStore, [model, specs, secrets, baseOf])
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

const BUNDLE_SPECS: SettingsFieldSpec[] = [defaultModelSpec, fallbackModelsSpec, {
  field: 'enabled',
  format: (value) => typeof value === 'boolean' ? String(value) : '',
  parse: (text) => text === 'true' || text === 'false' ? { kind: 'set', value: text === 'true' } : undefined,
}]
const OPERATION_SPECS: SettingsFieldSpec[] = [...BUNDLE_SPECS, {
  field: 'agentEnabled',
  format: (value) => value === true ? 'true' : 'false',
  parse: (text) => text === 'true' || text === 'false' ? { kind: 'set', value: text === 'true' } : undefined,
}]
const NO_SECRETS: SettingsSecretSpec[] = []
const settingsPageStyle = { display: 'flex', flexDirection: 'column', gap: 16 }

const GITHUB_ISSUE_URLS = {
  bug: 'https://github.com/exoticknight/dsh-system1/issues/new?template=bug_report.yml',
  provider: 'https://github.com/exoticknight/dsh-system1/issues/new?template=provider_request.yml',
  model: 'https://github.com/exoticknight/dsh-system1/issues/new?template=model_request.yml',
} as const

type IssueLinkKind = keyof typeof GITHUB_ISSUE_URLS
const issueLinkLabels: Readonly<Record<IssueLinkKind, keyof typeof en>> = {
  bug: 'reportIssue',
  provider: 'requestProvider',
  model: 'requestModel',
}

function BundleSettingsPage(props: BoundPageProps) {
  const { t } = props
  const { scope, status } = useConfigScope(props.ctx, 'system1')
  if (props.view === 'summary') return h('p', null, t('coreSummary'))
  return h('div', { style: settingsPageStyle },
    h('div', null,
    h(Button, {
      variant: 'ghost',
      size: 'sm',
      icon: h(IconInfoOutlineRegular, { size: 14 }),
      onClick: requestManualReleaseNotes,
    }, t('releaseEntry'))),
    h('div', { style: settingsPageStyle },
      settingsState(t, status) ?? h(CatalogSettings, { t, ctx: props.ctx, scope }),
      h(IssueLinks, { t, kinds: ['bug', 'provider', 'model'], prompt: 'feedbackPrompt' })))
}

type CatalogView = { status: 'loading' | 'unavailable' | 'ready'; catalog?: SettingsCatalog }

function useCatalog(ctx: Context) {
  const [view, setView] = useState<CatalogView>({ status: 'loading' })
  useEffect(() => {
    const fiber = ctx.inject(['remote.system1Settings'], (remoteCtx) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      let disposed = false
      let stop: (() => Promise<void>) | undefined
      setView({ status: 'loading' })
      const connect = async () => {
        try {
          const stream = remoteCtx.remote.$stream<SettingsCatalog>({
            name: 'System1 settings directory',
            open: (signal: AbortSignal) => remoteCtx.remote.system1Settings.watch(signal),
            ended: () => new Error('System1 settings directory closed'),
            carrierFailed: () => { if (!disposed) setView((view) => ({ ...view, status: 'unavailable' })) },
          })
          stop = () => stream.dispose()
          for await (const item of stream) {
            const catalog = projectCatalog(item.value)
            item.accept()
            if (!disposed) setView({ status: 'ready', catalog })
          }
        } catch {
          // A service reload can withdraw the endpoint before the new instance
          // publishes its catalog. Keep the error visible while reattaching.
        } finally {
          if (!disposed) {
            setView((view) => ({ ...view, status: 'unavailable' }))
            timer = setTimeout(() => { void connect() }, 2000)
          }
        }
      }
      void connect()
      return () => {
        disposed = true
        clearTimeout(timer)
        void stop?.()
      }
    })
    return () => { void fiber.dispose() }
  }, [ctx])
  return view
}

function providerLabel(t: Copy, id: string) {
  const provider = PROVIDERS.find((item) => item.id === id)
  return provider ? t(provider.label) : id
}

function modelLabel(t: Copy, provider: string, id: string) {
  const key = provider === 'laya' && Object.hasOwn(LAYA_MODEL_LABELS, id) ? LAYA_MODEL_LABELS[id] : undefined
  return key ? `${t(key)} (${id})` : id
}

function operationTitle(ctx: Context, entry: OperationCatalogEntry) {
  return localized(ctx, entry.title, Object.entries(entry.translations ?? {}).map(([locale, copy]) => [locale, copy.title]))
}

function operationDescription(ctx: Context, entry: OperationCatalogEntry) {
  return localized(ctx, entry.description ?? '', Object.entries(entry.translations ?? {}).flatMap(([locale, copy]) =>
    copy.description ? [[locale, copy.description]] : []))
}

function inputLabel(ctx: Context, input: OperationCatalogEntry['inputKinds'][number]) {
  return localized(ctx, input.title, Object.entries(input.translations ?? {}))
}

function inputLabels(ctx: Context, entry: OperationCatalogEntry, inputs: readonly string[]) {
  return inputs.map((id) => {
    const kind = entry.inputKinds.find((input) => input.id === id)
    return kind ? inputLabel(ctx, kind) : id
  }).join(', ')
}

function localized(ctx: Context, en: string, entries: readonly [string, string][]) {
  const translations = Object.fromEntries(entries.map(([locale, copy]) => [locale.toLowerCase(), copy]))
  // DSH's built-in Simplified Chinese id is "zh", not the BCP 47 "zh-CN".
  return ctx.locale.resolveText({ zh: translations['zh-cn'], ...translations, en })
}

function CatalogSettings(props: { t: Copy; ctx: Context; scope: SettingsFormScope<ConfigValues> }) {
  const { t, ctx, scope } = props
  const view = useCatalog(ctx)
  const [operation, setOperation] = useState('decide')
  const tabsId = useId()
  const operationsHeading = useId()
  if (!view.catalog) return h('p', { role: 'status', style: settingsHintStyle },
    t(view.status === 'loading' ? 'loading' : 'directoryUnavailable'))
  const entries = view.catalog.operations
  return h('div', { style: settingsPageStyle },
    view.status !== 'ready' && h('p', { role: 'status', style: settingsHintStyle }, t('directoryUnavailable')),
    h('section', { style: settingsPageStyle, 'aria-labelledby': operationsHeading },
      h('h3', { id: operationsHeading, style: directoryTitleStyle }, t('operationDirectory')),
      h(OperationDirectory, {
        t, ctx, scope, entries, id: tabsId, operation, onChange: setOperation, directoryReady: view.status === 'ready',
      })))
}

function OperationDirectory(props: {
  t: Copy; ctx: Context; scope: SettingsFormScope<ConfigValues>; entries: readonly OperationCatalogEntry[];
  id: string; operation: string; onChange: (value: string) => void; directoryReady: boolean;
}) {
  const { t, ctx, scope, entries, id, operation, onChange, directoryReady } = props
  const items = entries.map((entry) => ({
    value: entry.id, label: operationTitle(ctx, entry),
    render: () => h(OperationSettings, { key: entry.version, t, ctx, scope, entry, directoryReady }),
  }))
  return h(SettingsTabs, { id, label: t('operationDirectory'), items, value: operation, onChange })
}

interface SettingsTab {
  value: string
  label: string
  render: () => ReactNode
}

function tabDomId(prefix: string, value: string) {
  return `${prefix}-tab-${encodeURIComponent(value)}`
}

/** Keep visited panels mounted so tab navigation does not discard form drafts. */
function SettingsTabs(props: {
  id: string; label: string; items: readonly SettingsTab[];
  value: string; onChange: (value: string) => void;
}) {
  const { id, label, items, value, onChange } = props
  const selected = items.find((item) => item.value === value)?.value ?? items[0]?.value
  const visited = useRef(new Set<string>())
  useEffect(() => { if (selected) visited.current.add(selected) }, [selected])
  const [first, ...rest] = items.map(({ value, label }) => ({
    value, label, id: tabDomId(id, value), panelId: `${tabDomId(id, value)}-panel`,
  }))
  if (!selected || !first) return null
  const minTabWidth = Math.max(...items.map(({ label }) => label.length * 7 + 28), 72)
  return h('div', { style: settingsPageStyle },
    h('div', { style: scrollTabsStyle },
      h('div', { style: { minWidth: minTabWidth * items.length } },
        h(SegmentedTabs<string>, { label, value: selected, onChange, items: [first, ...rest] }))),
    ...items.map(({ value, render }) => {
      const tabId = tabDomId(id, value)
      return h('section', {
        key: value, id: `${tabId}-panel`, role: 'tabpanel', 'aria-labelledby': tabId, hidden: selected !== value,
      }, selected === value || visited.current.has(value) ? render() : null)
    }))
}

function ProviderModelList(props: {
  t: Copy; ctx: Context; instanceId: string | undefined; provider: ProviderSettings; view: CatalogView;
}) {
  const { t, ctx, instanceId, provider, view } = props
  const heading = useId()
  const models = instanceId ? providerModels(view.catalog?.operations ?? [], instanceId) : undefined
  return h('section', { style: settingsPageStyle, 'aria-labelledby': heading },
    h('h4', { id: heading, style: directoryTitleStyle }, t('providerModels')),
    view.status !== 'ready' && h('p', { role: 'status', style: settingsHintStyle },
      t(view.status === 'loading' ? 'loading' : 'directoryUnavailable')),
    view.status === 'ready' && !models?.size && h('p', { style: settingsHintStyle },
      t(instanceId ? 'providerModelsUnavailable' : 'providerInstanceUnavailable')),
    ...[...models ?? []].map(([id, usage]) => {
      const labels = usage.flatMap(({ entry, positions }) => {
        const operation = operationTitle(ctx, entry)
        return positions.map((position) => h(Tag, {
          key: `${entry.id}:${position.kind === 'primary' ? 0 : position.index}`, tone: 'neutral',
        }, position.kind === 'primary' ? t('modelRoutePrimary', { operation })
          : t('modelRouteFallback', { operation, index: position.index })))
      })
      return h('section', { key: id, style: directoryCardStyle },
        h('h5', { style: sectionTitleStyle }, id ? modelLabel(t, provider.id, id) : t('chooseDeployment')),
        h('ul', { style: catalogListStyle, 'aria-label': t('declaredSupport') },
          ...usage.map(({ entry, inputs }) => h('li', { key: entry.id },
            operationTitle(ctx, entry),
            inputs.length ? ` · ${inputLabels(ctx, entry, inputs)}` : ''))),
        labels.length ? h('div', { style: modelUsageStyle }, ...labels)
          : h('p', { style: settingsHintStyle }, t('unusedModel')))
    }))
}

function IssueLinks(props: {
  t: Copy
  kinds: ReadonlyArray<IssueLinkKind>
  prompt: 'feedbackPrompt' | 'providerFeedbackPrompt'
}) {
  return h('div', { style: issueLinksSectionStyle },
    h('p', { style: settingsHintStyle }, props.t(props.prompt)),
    h('nav', { 'aria-label': props.t(props.prompt), style: issueLinksStyle },
      ...props.kinds.map((kind) => h('a', {
        key: kind,
        href: GITHUB_ISSUE_URLS[kind],
        target: '_blank',
        rel: 'noopener noreferrer',
        style: issueLinkStyle,
      }, props.t(issueLinkLabels[kind]), h('span', { 'aria-hidden': true }, ' ↗')))))
}

function OperationSettings(props: {
  t: Copy; ctx: Context; entry: OperationCatalogEntry; scope: SettingsFormScope<ConfigValues>
  directoryReady: boolean
}) {
  const { t, ctx, entry } = props
  const prefix = useId()
  const decide = entry.id === 'decide'
  const scope = useMemo(() => routeScope(props.scope, entry.id, entry.version), [props.scope, entry.id, entry.version])
  const { view, actions } = useSettingsForm(scope, decide || !entry.tool ? BUNDLE_SPECS : OPERATION_SPECS, NO_SECRETS)
  const disabled = !props.directoryReady || !view.shell.writable || view.shell.saving
  const enabled = view.fields.enabled?.text === 'true'
  const defaultField = view.fields.defaultModel!
  const defaultRow = readFallbackModels([parseJson(defaultField.text)])[0]!
  const fallbackField = view.fields.fallbackModels!
  const fallbacks = readFallbackModels(parseJson(fallbackField.text))
  const editFallbacks = (rows: FallbackModelDraft[]) =>
    actions.edit('fallbackModels', JSON.stringify(rows))
  const agentEnabled = view.fields.agentEnabled?.text === 'true'
  const primaryAvailable = !!describeCandidate(entry, defaultRow)
  const savedPrimaryAvailable = entry.route.compatible && entry.route.defaultModel &&
    !!describeCandidate(entry, entry.route.defaultModel)
  const changedPrimary = defaultRow.provider !== (entry.route.defaultModel?.provider ?? '') ||
    defaultRow.model !== (entry.route.defaultModel?.model ?? '')
  const missingPrimary = enabled && agentEnabled && !primaryAvailable && (
    !entry.route.agentEnabled || changedPrimary || !entry.route.compatible
  )
  const configuredProviders = new Set([defaultRow, ...fallbacks].map(({ provider }) => provider).filter(Boolean))
  const description = operationDescription(ctx, entry)
  const title = operationTitle(ctx, entry)
  const enableLabel = t('featureEnable', { operation: title })

  return h('div', { style: settingsPageStyle },
    h('header', { style: catalogHeadingStyle },
      h('h3', { style: sectionTitleStyle }, title),
      description && h('p', { style: settingsHintStyle }, description)),
    !entry.route.compatible && h('p', { role: 'note', style: warningStyle }, t('routeVersionMismatch')),
    h(SettingsForm, {
    labels: settingsFormLabels(t),
    state: missingPrimary || !props.directoryReady ? { ...view.shell, invalid: true } : view.shell,
    onSave: actions.save,
    onDiscard: actions.discard,
    children: [
      h('section', { key: 'enable', style: featureSwitchCardStyle },
        h('div', { style: catalogHeadingStyle },
          h('h4', { style: sectionTitleStyle }, enableLabel),
          h('p', { style: settingsHintStyle }, t('featureSwitchHelp')),
          !enabled && h('p', { style: warningStyle }, t('featureOff'))),
        h(Switch, {
          checked: enabled, label: enableLabel, disabled,
          onChange: (checked: boolean) => actions.edit('enabled', String(checked)),
        })),
      h(SelectField, {
        key: 'default',
        id: `${prefix}-default-model`,
        label: t('model'),
        hint: t(decide ? 'defaultHint' : 'operationDefaultHint'),
        overridden: defaultField.overridden,
        invalid: defaultField.invalid,
        invalidLabel: t('required'),
        disabled,
        t,
        onReset: () => actions.resetField('defaultModel'),
      }, h('div', { style: modelPairStyle },
        modelSelectors(t, ctx, entry, `${prefix}-default`, 'model', defaultRow, disabled, defaultField.invalid,
          (row) => actions.edit('defaultModel', JSON.stringify(row)))),
        !decide && defaultField.text && h('button', {
          type: 'button', style: textLinkStyle, disabled,
          onClick: () => actions.edit('defaultModel', ''),
        }, t('clearModel'))),
      h(SelectField, {
        key: 'fallbacks',
        id: `${prefix}-fallback-models`,
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
        h('div', { style: modelPairStyle },
          modelSelectors(t, ctx, entry, `${prefix}-fallback-${index}`, 'fallbackModel', row, disabled, fallbackField.invalid,
            (next) => editFallbacks(updateFallbackModel(fallbacks, index, next)))),
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
        disabled: disabled || entry.providers.length === 0,
        onClick: () => editFallbacks(addFallbackModel(fallbacks, { provider: '', model: '' })),
      }, t('fallbackAdd')))),
      entry.providers.length === 0 && h('p', { key: 'no-providers', style: settingsHintStyle }, t('noProviders')),
      configuredProviders.size > 1 && h('p', { key: 'transfer-warning', style: warningStyle }, t('crossProviderWarning')),
      !decide && h('section', { key: 'preview', style: routeCardStyle, 'aria-label': t('routePreview') },
        h('h4', { style: sectionTitleStyle }, t('routePreview')),
        h('dl', { style: previewStyle }, ...previewRoute(entry, [defaultRow, ...fallbacks]).flatMap(({ input, candidates }) => [
          h('dt', { key: `${input.id}-label`, style: previewLabelStyle }, inputLabel(ctx, input)),
          h('dd', { key: `${input.id}-route`, style: previewValueStyle },
            candidates.length === 0 ? t('emptyRoute') : candidates.map(({ provider, model }) =>
              `${providerLabel(t, provider)} / ${modelLabel(t, provider, model)}`).join(' → ')),
        ]))),
      entry.tool && h('section', { key: 'agent', style: routeCardStyle },
        h('div', { style: fieldHeadStyle },
          h('h4', { style: { ...sectionTitleStyle, ...fieldLabelStyle } }, t('agentTool')),
          h(Tag, { tone: 'neutral' },
            t(!entry.route.agentEnabled ? 'agentToolDisabled' : !entry.route.enabled ? 'agentToolFeatureOff'
              : entry.agentAvailable ? 'agentToolEnabled'
              : savedPrimaryAvailable ? 'agentToolUnmounted' : 'agentToolUnavailable'))),
        decide
          ? h('p', { style: settingsHintStyle }, t('agentToolLegacy'))
          : h('label', { style: checkboxStyle },
            h('input', {
              type: 'checkbox', checked: agentEnabled,
              disabled: disabled || (!agentEnabled && !primaryAvailable),
              onChange: (event) => actions.edit('agentEnabled', String(event.currentTarget.checked)),
            }), entry.tool.name),
        !decide && !primaryAvailable && h('p', { style: missingPrimary ? warningStyle : settingsHintStyle }, t('agentToolNeedsPrimary'))),
    ],
  }))
}

function modelSelectors(
  t: Copy,
  ctx: Context,
  entry: OperationCatalogEntry,
  idPrefix: string,
  modelField: 'model' | 'fallbackModel',
  row: FallbackModelDraft,
  disabled: boolean,
  invalid: boolean,
  onChange: (row: FallbackModelDraft) => void,
) {
  const info = entry.providers.find((candidate) => candidate.id === row.provider)
  const supported = describeCandidate(entry, row)?.inputs
  const models = info?.models.kind === 'fixed' ? info.models.models : []
  const providerOptions = [
    ...(!info && row.provider
      ? [{ id: row.provider, label: `${t('providerUnknown')}: ${row.provider}` }]
      : []),
    ...entry.providers.map(({ id }) => ({ id, label: providerLabel(t, id) })),
  ]
  const modelOptions = [
    ...(row.model && !models.some((candidate) => candidate.id === row.model)
      ? [{ id: row.model, label: describeCandidate(entry, row) ? row.model : `${row.model} · ${t('unavailableModel')}` }]
      : []),
    ...models.map(({ id }) => ({
      id,
      label: modelLabel(t, row.provider, id),
    })),
  ]
  return [
    h(Dropdown, {
      key: 'provider',
      id: `${idPrefix}-provider`,
      label: t('provider'),
      value: row.provider,
      placeholder: t('fallbackChooseService'),
      options: providerOptions,
      disabled: disabled || providerOptions.length === 0,
      invalid,
      onChange: (provider: string) => {
        const next = entry.providers.find((candidate) => candidate.id === provider)?.models
        onChange({ provider, model: next?.kind === 'fixed' ? next.models[0]?.id ?? '' : '' })
      },
    }),
    info?.models.kind === 'deployment' ? h('input', {
      key: 'model',
      id: `${idPrefix}-model`,
      type: 'text',
      style: deploymentInputStyle,
      autoComplete: 'off',
      'aria-label': t('chooseDeployment'),
      'aria-invalid': invalid || undefined,
      placeholder: t('chooseDeployment'),
      value: row.model,
      disabled,
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange({ ...row, model: event.currentTarget.value }),
    }) : h(Dropdown, {
      key: 'model',
      id: `${idPrefix}-model`,
      label: t(modelField),
      value: row.model,
      placeholder: t('fallbackChooseModel'),
      options: modelOptions,
      disabled: disabled || !info,
      invalid,
      onChange: (model: string) => onChange({ ...row, model }),
    }),
    !!supported?.length && h('p', { key: 'supported', style: modelSupportStyle },
      t('modelSupports', { inputs: inputLabels(ctx, entry, supported) })),
  ]
}

/**
 * DSH's settings dropdown: a trigger button opening the primitives Menu with the current choice
 * selected, as the plugin inventory's preset switcher does. Trigger styles copy that switcher.
 */
function Dropdown(props: {
  id: string
  label: string
  value: string
  placeholder: string
  options: ReadonlyArray<{ id: string; label: string }>
  disabled: boolean
  invalid: boolean
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const current = props.options.find((option) => option.id === props.value)
  return h(Menu, {
    open,
    onClose: () => setOpen(false),
    items: props.options,
    ...(current ? { selectedId: current.id } : {}),
    onSelect: (id: string) => {
      setOpen(false)
      if (id !== props.value) props.onChange(id)
    },
    align: 'start',
    portal: true,
    anchor: h('button', {
      id: props.id,
      type: 'button',
      'aria-label': props.label,
      'aria-description': current?.label,
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      ...(props.invalid ? { 'aria-invalid': true } : {}),
      disabled: props.disabled,
      style: {
        ...dropdownTriggerStyle,
        ...(props.invalid ? dropdownInvalidStyle : {}),
        ...(props.disabled ? dropdownDisabledStyle : {}),
      },
      onClick: () => setOpen((value) => !value),
    },
    h('span', { style: dropdownLabelStyle }, current?.label ?? props.placeholder),
    h(IconChevronDownOutlineRegular, { size: 12 })),
  })
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
  if (props.view === 'summary') return h('p', null, props.t(props.provider.summary))
  return h(ProviderSettingsDetail, props)
}

function ProviderSettingsDetail(props: BoundPageProps & { provider: ProviderSettings }) {
  const { t, provider, ctx } = props
  const { scope, status } = useConfigScope(ctx, provider.rowId)
  const connectionHeading = useId()
  const view = useCatalog(ctx)
  const instance = providerComponent(view.catalog?.providerComponents, provider.rowId, `${PACKAGE}/providers/${provider.id}`)
  const keyRef = view.status === 'ready' ? instance?.keyRef : undefined
  return h('div', { style: settingsPageStyle },
    h('section', { 'aria-labelledby': connectionHeading },
      h('h4', { id: connectionHeading, style: directoryTitleStyle }, t('connectionSettings')),
      instance && h('p', { style: settingsHintStyle }, t('providerInstanceId'), ': ', h('code', null, instance.providerId)),
      settingsState(t, status) ??
        h(ProviderSettingsForm, { key: keyRef ?? 'unavailable', t, provider, keyRef, scope, ctx })),
    status === 'ready' && h(ProviderModelList, { t, ctx, instanceId: instance?.providerId, provider, view }),
    h(IssueLinks, { t, kinds: ['bug'], prompt: 'providerFeedbackPrompt' }))
}

function ProviderSettingsForm(props: {
  t: Copy
  provider: ProviderSettings
  keyRef: string | undefined
  scope: SettingsFormScope<ConfigValues>
  ctx: Context
}) {
  const { t, provider, ctx, keyRef } = props
  const [credential, setCredential] = useState({ available: keyRef !== undefined, configured: false, writable: true })
  const refresh = useCallback(async () => {
    if (keyRef === undefined) return
    try {
      const response = await ctx.remote.credentials.describe([keyRef])
      if (!response.ok) {
        setCredential((current) => ({ ...current, available: false }))
        return
      }
      const info = response.value[keyRef]
      setCredential({
        available: true,
        configured: info?.configured ?? false,
        writable: info?.writable ?? true,
      })
    } catch {
      setCredential((current) => ({ ...current, available: false }))
    }
  }, [ctx, keyRef])
  useEffect(() => {
    void refresh()
    return ctx.remote.$on('credentials/reference-updated', (ref: string) => {
      if (ref === keyRef) void refresh()
    })
  }, [ctx, keyRef, refresh])
  const specs = useMemo(
    () => provider.accountId
      ? [endpointSpec, accountIdSpec, timeoutSpec]
      : [endpointSpec, timeoutSpec],
    [provider],
  )
  const secrets = useMemo((): SettingsSecretSpec[] => [{
    field: 'apiKey',
    write: async (text) => {
      if (keyRef === undefined) return false
      const response = await ctx.remote.credentials.set(keyRef, text)
      await refresh()
      return response.ok
    },
  }], [ctx, keyRef, refresh])
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
      h(SettingsValueField, {
        key: 'timeout',
        id: `dsh-system1-${provider.id}-timeout`,
        label: t('timeout'),
        hint: t(provider.timeoutHint),
        overriddenLabel: t('overridden'),
        resetLabel: t('reset'),
        invalidLabel: t('invalidTimeout'),
        numeric: true,
        disabled,
        ...view.fields.timeoutMs!,
        onEdit: (text: string) => actions.edit('timeoutMs', text),
        onReset: () => actions.resetField('timeoutMs'),
      }),
      provider.note && h('p', { key: 'note', style: settingsHintStyle }, t(provider.note)),
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
// The plugin inventory's preset switcher trigger, stretched to fill its grid cell.
const dropdownTriggerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  minWidth: 0,
  height: 36,
  padding: '0 14px',
  border: 'none',
  borderRadius: 'var(--dsw-radius-md)',
  background: 'var(--dsw-alias-bg-module-platform)',
  color: 'var(--dsw-alias-label-primary)',
  font: 'inherit',
  fontSize: 14,
  lineHeight: '22px',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
}
const dropdownLabelStyle = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }
const dropdownInvalidStyle = { boxShadow: 'inset 0 0 0 1px var(--dsw-alias-state-error-primary)' }
const dropdownDisabledStyle = { color: 'var(--dsw-alias-label-tertiary)', cursor: 'default' }
const modelPairStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
  flex: 1,
  minWidth: 0,
}
const selectStackStyle = { display: 'flex', flexDirection: 'column', gap: 8 }
const fallbackRowStyle = { display: 'flex', alignItems: 'center', gap: 8 }
const settingsHintStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-tertiary)',
}
const modelSupportStyle = { ...settingsHintStyle, gridColumn: '1 / -1' }
const issueLinksSectionStyle = { display: 'flex', flexDirection: 'column', gap: 8 }
const issueLinksStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 13, lineHeight: 1.5 }
const issueLinkStyle = {
  color: 'var(--dsw-alias-label-secondary)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}
const scrollTabsStyle = { overflowX: 'auto' as const, minWidth: 0 }
const directoryTitleStyle = {
  margin: 0, flex: 1, fontSize: 16, fontWeight: 600, lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
}
const catalogHeadingStyle = { display: 'flex', flexDirection: 'column' as const, gap: 5 }
const sectionTitleStyle = {
  margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
}
const directoryCardStyle = {
  display: 'grid', gap: 8, padding: '12px 14px',
  borderRadius: 'var(--dsw-radius-md)',
  background: 'var(--dsw-alias-bg-module-platform)',
}
const routeCardStyle = { ...directoryCardStyle, marginTop: 8 }
const featureSwitchCardStyle = {
  ...directoryCardStyle, gridTemplateColumns: '1fr auto', alignItems: 'center',
  padding: '14px 16px',
}
const catalogListStyle = { margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 }
const modelUsageStyle = { display: 'flex', flexWrap: 'wrap' as const, gap: 6 }
const textLinkStyle = {
  border: 0, padding: 0, background: 'none', font: 'inherit', fontSize: 13, textAlign: 'start' as const,
  color: 'var(--dsw-alias-label-primary)', textDecoration: 'underline', textUnderlineOffset: 3,
  cursor: 'pointer',
}
const warningStyle = { ...settingsHintStyle, color: 'var(--dsw-alias-label-secondary)', paddingInlineStart: 10,
  borderInlineStart: '2px solid currentColor' }
const previewStyle = {
  display: 'grid', gridTemplateColumns: 'minmax(2ch, auto) 1fr', margin: 0, gap: '5px 14px',
  fontSize: 13, lineHeight: 1.5,
}
const previewLabelStyle = { fontWeight: 500 }
const previewValueStyle = { margin: 0, overflowWrap: 'anywhere' as const }
const checkboxStyle = { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }
const deploymentInputStyle = {
  ...dropdownTriggerStyle, boxSizing: 'border-box' as const, border: '1px solid currentColor', cursor: 'text',
}
