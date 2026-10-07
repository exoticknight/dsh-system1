window.__ModuleLoader__.load({
  id: "dsh-system1",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

    // src/client/index.ts
    var index_exports = {};
    __export(index_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(index_exports);
    var import_react = require("react");
    var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

    // src/client/fallback-models.ts
    function readFallbackModels(value) {
      if (!Array.isArray(value)) return [];
      return value.map((item) => {
        const row = item !== null && typeof item === "object" && !Array.isArray(item) ? item : {};
        return {
          provider: typeof row.provider === "string" ? row.provider : "",
          model: typeof row.model === "string" ? row.model : ""
        };
      });
    }
    function fallbackModelsValid(rows) {
      return rows.every(
        (row) => row.provider.trim() !== "" && row.model.trim() !== ""
      );
    }
    function addFallbackModel(rows, model) {
      return [...rows.map(copyFallbackModel), copyFallbackModel(model)];
    }
    function updateFallbackModel(rows, index, update) {
      if (index < 0 || index >= rows.length) return [...rows.map(copyFallbackModel)];
      return rows.map(
        (row, rowIndex) => rowIndex === index ? { ...row, ...update } : copyFallbackModel(row)
      );
    }
    function moveFallbackModel(rows, index, offset) {
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= rows.length)
        return [...rows.map(copyFallbackModel)];
      const result = rows.map(copyFallbackModel);
      const current = result[index];
      result[index] = result[destination];
      result[destination] = current;
      return result;
    }
    function removeFallbackModel(rows, index) {
      if (index < 0 || index >= rows.length) return [...rows.map(copyFallbackModel)];
      return rows.filter((_row, rowIndex) => rowIndex !== index).map(copyFallbackModel);
    }
    function copyFallbackModel(row) {
      return { provider: row.provider, model: row.model };
    }

    // src/client/overrides.ts
    function hasDefault(spec, base) {
      if (base === void 0 || base === null) return false;
      const text = spec.format(base);
      return text !== "" && text !== "[]";
    }
    function overriddenAgainstDefault(state, spec, base) {
      return state.overridden && hasDefault(spec, base) && state.text !== spec.format(base);
    }

    // src/client/index.ts
    var NS = "dsh-system1";
    var PACKAGE = "dsh-system1";
    var en = {
      coreSummary: "Choose a default model and ordered fallbacks, then set the shared request timeout.",
      provider: "Default service",
      providerTypesafe: "TypeSafe (Jev)",
      providerLaya: "Laya",
      providerCloudflare: "Cloudflare Clef",
      providerUnknown: "Unsupported service",
      model: "Default model",
      fallbackModels: "Fallback models",
      fallbackHint: "Tried in order when the default model fails.",
      fallbackRequired: "Choose a service and model for each fallback.",
      fallbackModel: "Fallback model",
      fallbackChooseService: "Choose a service",
      fallbackChooseModel: "Choose a model",
      fallbackAdd: "Add fallback model",
      fallbackUp: "Move up",
      fallbackDown: "Move down",
      fallbackRemove: "Remove",
      timeout: "Request timeout (ms)",
      defaultHint: "Used when a decision request does not specify a model.",
      timeoutHint: "Applies when a decision request does not provide its own timeout.",
      providerEnabledHint: "Enable the matching service component in the list below.",
      reset: "Reset to package default",
      overridden: "Overridden",
      save: "Save settings",
      saving: "Saving\u2026",
      saveFailed: "DSH did not accept these settings. Check the values and try again.",
      loading: "Loading settings\u2026",
      unavailable: "Settings are unavailable while this component is not loaded.",
      readOnly: "This DSH profile does not allow settings changes.",
      required: "Choose a service and model.",
      invalidTimeout: "Enter a whole number from 1 to 2147483647.",
      key: "API Key",
      keyHint: "Stored in DSH credentials and never shown here. Leave blank to keep the saved key.",
      layaKeyHint: "Optional for a local Laya server without authentication. If LAYA_API_KEY is set, enter that key. Leave blank to keep the saved key.",
      keyStatusConfigured: "Configured",
      keyStatusMissing: "Not configured",
      keyStatusUnavailable: "Unavailable",
      keyReadOnly: "The current credential source is read-only.",
      keyUnavailable: "The DSH credential service is unavailable.",
      typesafeSummary: "Configure the TypeSafe endpoint and its API Key.",
      layaSummary: "Configure the Laya endpoint and optional API Key.",
      typesafeEndpoint: "TypeSafe API base URL",
      typesafeEndpointHint: "The TypeSafe System One endpoint is appended automatically.",
      layaEndpoint: "Laya server base URL",
      layaEndpointHint: "Use the base URL of a Laya server exposing POST /v1/systemone.",
      cloudflareSummary: "Configure the Cloudflare API endpoint, account, and API token.",
      cloudflareEndpoint: "Cloudflare API base URL",
      cloudflareEndpointHint: "Use the Cloudflare API v4 base URL.",
      cloudflareAccountId: "Cloudflare account ID",
      cloudflareAccountIdHint: "Enter the 32-character account ID, or leave blank to use CLOUDFLARE_ACCOUNT_ID.",
      invalidEndpoint: "Enter a full HTTP or HTTPS URL.",
      invalidAccountId: "Enter a 32-character Cloudflare account ID, or leave it blank to use the environment variable.",
      modelAuto: "Auto route by language",
      modelEnglish: "English checkpoint",
      modelMultilingual: "Multilingual checkpoint",
      modelTypedDecisions: "Typed-decisions checkpoint"
    };
    var zh = {
      coreSummary: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B\u548C\u6309\u987A\u5E8F\u5C1D\u8BD5\u7684\u5907\u7528\u6A21\u578B\uFF0C\u5E76\u8BBE\u7F6E\u901A\u7528\u8BF7\u6C42\u8D85\u65F6\u3002",
      provider: "\u9ED8\u8BA4\u670D\u52A1",
      providerTypesafe: "TypeSafe\uFF08Jev\uFF09",
      providerLaya: "Laya",
      providerCloudflare: "Cloudflare Clef",
      providerUnknown: "\u6682\u4E0D\u652F\u6301\u7684\u670D\u52A1",
      model: "\u9ED8\u8BA4\u6A21\u578B",
      fallbackModels: "\u5907\u7528\u6A21\u578B",
      fallbackHint: "\u9ED8\u8BA4\u6A21\u578B\u5931\u8D25\u65F6\u6309\u987A\u5E8F\u4F9D\u6B21\u5C1D\u8BD5\u3002",
      fallbackRequired: "\u8BF7\u4E3A\u6BCF\u4E2A\u5907\u7528\u9879\u9009\u62E9\u670D\u52A1\u548C\u6A21\u578B\u3002",
      fallbackModel: "\u5907\u7528\u6A21\u578B",
      fallbackChooseService: "\u9009\u62E9\u670D\u52A1",
      fallbackChooseModel: "\u9009\u62E9\u6A21\u578B",
      fallbackAdd: "\u6DFB\u52A0\u5907\u7528\u6A21\u578B",
      fallbackUp: "\u4E0A\u79FB",
      fallbackDown: "\u4E0B\u79FB",
      fallbackRemove: "\u5220\u9664",
      timeout: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
      defaultHint: "\u51B3\u7B56\u8BF7\u6C42\u672A\u6307\u5B9A\u6A21\u578B\u65F6\u4F7F\u7528\u3002",
      timeoutHint: "\u51B3\u7B56\u8BF7\u6C42\u6CA1\u6709\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002",
      providerEnabledHint: "\u8BF7\u5728\u4E0B\u65B9\u7EC4\u4EF6\u5217\u8868\u4E2D\u542F\u7528\u5BF9\u5E94\u7684\u670D\u52A1\u7EC4\u4EF6\u3002",
      reset: "\u6062\u590D\u9ED8\u8BA4\u503C",
      overridden: "\u5DF2\u8986\u76D6",
      save: "\u4FDD\u5B58\u8BBE\u7F6E",
      saving: "\u4FDD\u5B58\u4E2D\u2026",
      saveFailed: "DSH \u672A\u63A5\u53D7\u8FD9\u4E9B\u8BBE\u7F6E\uFF0C\u8BF7\u68C0\u67E5\u6570\u503C\u540E\u91CD\u8BD5\u3002",
      loading: "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
      unavailable: "\u7EC4\u4EF6\u672A\u52A0\u8F7D\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8BBE\u7F6E\u3002",
      readOnly: "\u5F53\u524D DSH \u914D\u7F6E\u6587\u4EF6\u4E0D\u5141\u8BB8\u4FEE\u6539\u8BBE\u7F6E\u3002",
      required: "\u8BF7\u9009\u62E9\u670D\u52A1\u548C\u6A21\u578B\u3002",
      invalidTimeout: "\u8BF7\u8F93\u5165 1 \u5230 2147483647 \u4E4B\u95F4\u7684\u6574\u6570\u3002",
      key: "API Key",
      keyHint: "\u5BC6\u94A5\u4FDD\u5B58\u5728 DSH \u51ED\u636E\u5B58\u50A8\u4E2D\uFF0C\u9875\u9762\u4E0D\u4F1A\u8BFB\u53D6\uFF1B\u7559\u7A7A\u4F1A\u4FDD\u7559\u5DF2\u4FDD\u5B58\u7684\u5BC6\u94A5\u3002",
      layaKeyHint: "\u672C\u5730 Laya \u672A\u542F\u7528\u9274\u6743\u65F6\u53EF\u7559\u7A7A\uFF1B\u914D\u7F6E\u4E86 LAYA_API_KEY \u65F6\u9700\u8981\u586B\u5199\u3002\u5BC6\u94A5\u4E0D\u4F1A\u56DE\u663E\uFF0C\u7559\u7A7A\u4F1A\u4FDD\u7559\u5DF2\u4FDD\u5B58\u503C\u3002",
      keyStatusConfigured: "\u5DF2\u914D\u7F6E",
      keyStatusMissing: "\u672A\u914D\u7F6E",
      keyStatusUnavailable: "\u6682\u4E0D\u53EF\u7528",
      keyReadOnly: "\u5F53\u524D\u51ED\u636E\u6765\u6E90\u4E3A\u53EA\u8BFB\u3002",
      keyUnavailable: "DSH \u51ED\u636E\u670D\u52A1\u6682\u4E0D\u53EF\u7528\u3002",
      typesafeSummary: "\u914D\u7F6E TypeSafe \u63A5\u53E3\u5730\u5740\u548C API Key\u3002",
      layaSummary: "\u914D\u7F6E Laya \u63A5\u53E3\u5730\u5740\u548C\u53EF\u9009 API Key\u3002",
      typesafeEndpoint: "TypeSafe API \u6839\u5730\u5740",
      typesafeEndpointHint: "\u63D2\u4EF6\u4F1A\u81EA\u52A8\u5728\u5730\u5740\u540E\u62FC\u63A5 TypeSafe System One \u63A5\u53E3\u8DEF\u5F84\u3002",
      layaEndpoint: "Laya \u670D\u52A1\u6839\u5730\u5740",
      layaEndpointHint: "\u586B\u5199\u63D0\u4F9B POST /v1/systemone \u63A5\u53E3\u7684 Laya \u670D\u52A1\u6839\u5730\u5740\u3002",
      cloudflareSummary: "\u914D\u7F6E Cloudflare API \u5730\u5740\u3001\u8D26\u53F7\u548C API Token\u3002",
      cloudflareEndpoint: "Cloudflare API \u6839\u5730\u5740",
      cloudflareEndpointHint: "\u586B\u5199 Cloudflare API v4 \u6839\u5730\u5740\u3002",
      cloudflareAccountId: "Cloudflare \u8D26\u53F7 ID",
      cloudflareAccountIdHint: "\u586B\u5199 32 \u4F4D\u8D26\u53F7 ID\uFF1B\u7559\u7A7A\u65F6\u4F7F\u7528\u73AF\u5883\u53D8\u91CF CLOUDFLARE_ACCOUNT_ID\u3002",
      invalidEndpoint: "\u8BF7\u8F93\u5165\u5B8C\u6574\u7684 HTTP \u6216 HTTPS \u5730\u5740\u3002",
      invalidAccountId: "\u8BF7\u8F93\u5165 32 \u4F4D Cloudflare \u8D26\u53F7 ID\uFF0C\u6216\u7559\u7A7A\u4EE5\u4F7F\u7528\u73AF\u5883\u53D8\u91CF\u3002",
      modelAuto: "\u6309\u8BED\u8A00\u81EA\u52A8\u8DEF\u7531",
      modelEnglish: "\u82F1\u6587\u6A21\u578B",
      modelMultilingual: "\u591A\u8BED\u8A00\u6A21\u578B",
      modelTypedDecisions: "\u7C7B\u578B\u5316\u51B3\u7B56\u6A21\u578B"
    };
    var PROVIDERS = [
      {
        id: "typesafe",
        rowId: "system1-typesafe",
        label: "providerTypesafe",
        summary: "typesafeSummary",
        keyRef: "TYPESAFE_API_KEY",
        keyHint: "keyHint",
        endpointLabel: "typesafeEndpoint",
        endpointHint: "typesafeEndpointHint",
        baseURL: "https://api.typesafe.ai",
        models: [{ id: "jev-latest" }, { id: "jev-preview" }, { id: "jev-1.13.0" }]
      },
      {
        id: "laya",
        rowId: "system1-laya",
        label: "providerLaya",
        summary: "layaSummary",
        keyRef: "LAYA_API_KEY",
        keyHint: "layaKeyHint",
        endpointLabel: "layaEndpoint",
        endpointHint: "layaEndpointHint",
        baseURL: "http://127.0.0.1:8000",
        models: [
          { id: "auto", label: "modelAuto" },
          { id: "english", label: "modelEnglish" },
          { id: "multilingual", label: "modelMultilingual" },
          { id: "typed-decisions", label: "modelTypedDecisions" }
        ]
      },
      {
        id: "cloudflare",
        rowId: "system1-cloudflare",
        label: "providerCloudflare",
        summary: "cloudflareSummary",
        keyRef: "CLOUDFLARE_API_TOKEN",
        keyHint: "keyHint",
        endpointLabel: "cloudflareEndpoint",
        endpointHint: "cloudflareEndpointHint",
        baseURL: "https://api.cloudflare.com/client/v4",
        models: [{ id: "clef" }, { id: "clef-flash" }],
        accountId: {
          path: "accountId",
          label: "cloudflareAccountId",
          hint: "cloudflareAccountIdHint",
          defaultValue: "",
          normalize: normalizeCloudflareAccountId
        }
      }
    ];
    var inject = ["slots", "locale", "remote", "remote.credentials", "configForms"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-system1 client copy");
      ctx.effect(
        () => ctx.slots.inject(
          "plugins.bundle.config",
          () => ctx.slots.register(
            { name: "plugins.bundle.config", key: PACKAGE, locale: NS },
            (props) => (0, import_react.createElement)(BundleSettingsPage, { ...props, ctx })
          )
        ),
        "dsh-system1 bundle settings page"
      );
      for (const provider of PROVIDERS) {
        ctx.effect(
          () => ctx.slots.inject(
            "plugins.row.config",
            () => ctx.slots.register(
              { name: "plugins.row.config", key: `${PACKAGE}#${provider.rowId}`, locale: NS },
              (props) => (0, import_react.createElement)(ProviderSettingsPage, { ...props, ctx, provider })
            )
          ),
          `dsh-system1 ${provider.id} settings page`
        );
      }
    }
    function useSettingsForm(scope, specs, secrets = []) {
      const baseOf = (0, import_react.useCallback)(
        (field) => objectValue(scope.getSnapshot().base)[field],
        [scope]
      );
      const model = (0, import_react.useMemo)(
        () => new import_dsh_client_ui_primitives.SettingsFormModel(scope, specs, secrets),
        [scope, specs, secrets]
      );
      (0, import_react.useEffect)(() => () => model.dispose(), [model]);
      const store = (0, import_react.useMemo)(() => model.bind(() => ({
        shell: model.shell(),
        fields: Object.fromEntries([
          ...specs.map((spec) => {
            const state = model.field(spec.field);
            return [spec.field, {
              ...state,
              overridden: overriddenAgainstDefault(state, spec, baseOf(spec.field))
            }];
          }),
          ...secrets.map(({ field }) => [field, model.field(field)])
        ])
      })), [model, specs, secrets, baseOf]);
      const subscribe = (0, import_react.useCallback)((listener) => store.subscribe(listener), [store]);
      const getSnapshot = (0, import_react.useCallback)(() => store.getSnapshot(), [store]);
      const view = (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
      const actions = (0, import_react.useMemo)(() => model.actions(), [model]);
      return { view, actions };
    }
    function useConfigScope(ctx, entryId) {
      const scope = (0, import_react.useMemo)(() => ctx.configForms.get(entryId), [ctx, entryId]);
      const subscribe = (0, import_react.useCallback)((listener) => scope.subscribe(listener), [scope]);
      const getStatus = (0, import_react.useCallback)(() => scope.getSnapshot().status, [scope]);
      const status = (0, import_react.useSyncExternalStore)(subscribe, getStatus, getStatus);
      return { scope, status };
    }
    var defaultModelSpec = {
      field: "defaultModel",
      format: (value) => {
        const row = objectValue(value);
        return typeof row.provider === "string" && typeof row.model === "string" ? JSON.stringify({ provider: row.provider, model: row.model }) : "";
      },
      parse: (text) => {
        if (text === "") return { kind: "clear" };
        const row = parseModelRow(text);
        return row ? { kind: "set", value: row } : void 0;
      }
    };
    var fallbackModelsSpec = {
      field: "fallbackModels",
      format: (value) => JSON.stringify(readFallbackModels(value)),
      parse: (text) => {
        const rows = readFallbackModels(parseJson(text));
        if (!fallbackModelsValid(rows)) return void 0;
        return {
          kind: "set",
          value: rows.map(({ provider, model }) => ({ provider: provider.trim(), model: model.trim() }))
        };
      }
    };
    var timeoutSpec = {
      field: "timeoutMs",
      format: (value) => typeof value === "number" ? String(value) : "",
      parse: (text) => {
        const trimmed = text.trim();
        if (trimmed === "") return { kind: "clear" };
        const parsed = Number(trimmed);
        return Number.isInteger(parsed) && parsed >= 1 && parsed <= 2147483647 ? { kind: "set", value: parsed } : void 0;
      }
    };
    var BUNDLE_SPECS = [defaultModelSpec, fallbackModelsSpec, timeoutSpec];
    var NO_SECRETS = [];
    function BundleSettingsPage(props) {
      const { t } = props;
      const { scope, status } = useConfigScope(props.ctx, "system1");
      if (props.view === "summary") return (0, import_react.createElement)("p", null, t("coreSummary"));
      return settingsState(t, status) ?? (0, import_react.createElement)(BundleSettingsForm, { t, scope });
    }
    function BundleSettingsForm(props) {
      const { t } = props;
      const { view, actions } = useSettingsForm(props.scope, BUNDLE_SPECS, NO_SECRETS);
      const disabled = !view.shell.writable || view.shell.saving;
      const defaultField = view.fields.defaultModel;
      const defaultRow = parseModelRow(defaultField.text) ?? { provider: "", model: "" };
      const fallbackField = view.fields.fallbackModels;
      const fallbacks = readFallbackModels(parseJson(fallbackField.text));
      const timeoutField = view.fields.timeoutMs;
      const editFallbacks = (rows) => actions.edit("fallbackModels", JSON.stringify(rows));
      const firstProvider = PROVIDERS[0];
      return (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsForm, {
        labels: settingsFormLabels(t),
        state: view.shell,
        onSave: actions.save,
        onDiscard: actions.discard,
        children: [
          (0, import_react.createElement)(SelectField, {
            key: "default",
            id: "dsh-system1-default-model",
            label: t("model"),
            hint: t("defaultHint"),
            overridden: defaultField.overridden,
            invalid: defaultField.invalid,
            invalidLabel: t("required"),
            disabled,
            t,
            onReset: () => actions.resetField("defaultModel")
          }, (0, import_react.createElement)(
            "div",
            { style: modelPairStyle },
            modelSelectors(
              t,
              "dsh-system1-default",
              defaultRow,
              disabled,
              defaultField.invalid,
              (row) => actions.edit("defaultModel", JSON.stringify(row))
            )
          )),
          (0, import_react.createElement)(
            SelectField,
            {
              key: "fallbacks",
              id: "dsh-system1-fallback-models",
              label: t("fallbackModels"),
              hint: t("fallbackHint"),
              overridden: fallbackField.overridden,
              invalid: fallbackField.invalid,
              invalidLabel: t("fallbackRequired"),
              disabled,
              t,
              onReset: () => actions.resetField("fallbackModels")
            },
            fallbacks.map((row, index) => (0, import_react.createElement)(
              "div",
              { key: index, style: fallbackRowStyle },
              (0, import_react.createElement)(
                "div",
                { style: modelPairStyle },
                modelSelectors(
                  t,
                  `dsh-system1-fallback-${index}`,
                  row,
                  disabled,
                  fallbackField.invalid,
                  (next) => editFallbacks(updateFallbackModel(fallbacks, index, next))
                )
              ),
              (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
                variant: "ghost",
                size: "sm",
                icon: (0, import_react.createElement)(import_dsh_client_ui_primitives.IconChevronUpOutlineRegular, { size: 13 }),
                disabled: disabled || index === 0,
                "aria-label": `${t("fallbackUp")} ${index + 1}`,
                title: t("fallbackUp"),
                onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, -1))
              }),
              (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
                variant: "ghost",
                size: "sm",
                icon: (0, import_react.createElement)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 13 }),
                disabled: disabled || index === fallbacks.length - 1,
                "aria-label": `${t("fallbackDown")} ${index + 1}`,
                title: t("fallbackDown"),
                onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, 1))
              }),
              (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
                variant: "ghost",
                size: "sm",
                icon: (0, import_react.createElement)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 13 }),
                disabled,
                "aria-label": `${t("fallbackRemove")} ${index + 1}`,
                title: t("fallbackRemove"),
                onClick: () => editFallbacks(removeFallbackModel(fallbacks, index))
              })
            )),
            (0, import_react.createElement)("div", null, (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
              variant: "outline",
              size: "sm",
              icon: (0, import_react.createElement)(import_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 13 }),
              disabled,
              onClick: () => editFallbacks(addFallbackModel(fallbacks, {
                provider: firstProvider.id,
                model: firstProvider.models[0]?.id ?? ""
              }))
            }, t("fallbackAdd")))
          ),
          (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsValueField, {
            key: "timeout",
            id: "dsh-system1-timeout",
            label: t("timeout"),
            hint: t("timeoutHint"),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidTimeout"),
            numeric: true,
            disabled: !view.shell.writable,
            ...timeoutField,
            onEdit: (text) => actions.edit("timeoutMs", text),
            onReset: () => actions.resetField("timeoutMs")
          }),
          (0, import_react.createElement)("p", { key: "note", style: settingsHintStyle }, t("providerEnabledHint"))
        ]
      });
    }
    function modelSelectors(t, idPrefix, row, disabled, invalid, onChange) {
      const info = PROVIDERS.find((candidate) => candidate.id === row.provider);
      const models = info?.models ?? [];
      const providerOptions = [
        ...!info && row.provider ? [{ id: row.provider, label: `${t("providerUnknown")}: ${row.provider}` }] : [],
        ...PROVIDERS.map((entry) => ({ id: entry.id, label: t(entry.label) }))
      ];
      const modelOptions = [
        ...row.model && !models.some((candidate) => candidate.id === row.model) ? [{ id: row.model, label: row.model }] : [],
        ...models.map((entry) => ({ id: entry.id, label: entry.label ? t(entry.label) : entry.id }))
      ];
      return [
        (0, import_react.createElement)(Dropdown, {
          key: "provider",
          id: `${idPrefix}-provider`,
          label: t("provider"),
          value: row.provider,
          placeholder: t("fallbackChooseService"),
          options: providerOptions,
          disabled,
          invalid,
          onChange: (provider) => {
            const next = PROVIDERS.find((candidate) => candidate.id === provider);
            onChange({ provider, model: next?.models[0]?.id ?? "" });
          }
        }),
        (0, import_react.createElement)(Dropdown, {
          key: "model",
          id: `${idPrefix}-model`,
          label: t("fallbackModel"),
          value: row.model,
          placeholder: t("fallbackChooseModel"),
          options: modelOptions,
          disabled: disabled || !info,
          invalid,
          onChange: (model) => onChange({ ...row, model })
        })
      ];
    }
    function Dropdown(props) {
      const [open, setOpen] = (0, import_react.useState)(false);
      const current = props.options.find((option) => option.id === props.value);
      return (0, import_react.createElement)(import_dsh_client_ui_primitives.Menu, {
        open,
        onClose: () => setOpen(false),
        items: props.options,
        ...current ? { selectedId: current.id } : {},
        onSelect: (id) => {
          setOpen(false);
          if (id !== props.value) props.onChange(id);
        },
        align: "start",
        portal: true,
        anchor: (0, import_react.createElement)(
          "button",
          {
            id: props.id,
            type: "button",
            "aria-label": props.label,
            "aria-haspopup": "menu",
            "aria-expanded": open,
            ...props.invalid ? { "aria-invalid": true } : {},
            disabled: props.disabled,
            style: {
              ...dropdownTriggerStyle,
              ...props.invalid ? dropdownInvalidStyle : {},
              ...props.disabled ? dropdownDisabledStyle : {}
            },
            onClick: () => setOpen((value) => !value)
          },
          (0, import_react.createElement)("span", { style: dropdownLabelStyle }, current?.label ?? props.placeholder),
          (0, import_react.createElement)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 12 })
        )
      });
    }
    function SelectField(props) {
      return (0, import_react.createElement)(
        "div",
        { role: "group", "aria-labelledby": `${props.id}-label`, style: fieldStyle },
        (0, import_react.createElement)(
          "div",
          { style: fieldHeadStyle },
          (0, import_react.createElement)("span", { id: `${props.id}-label`, style: fieldLabelStyle }, props.label),
          props.overridden && (0, import_react.createElement)(
            "span",
            { style: fieldBadgesStyle },
            (0, import_react.createElement)(import_dsh_client_ui_primitives.Tag, { tone: "neutral" }, props.t("overridden")),
            (0, import_react.createElement)("button", {
              type: "button",
              style: fieldResetStyle,
              disabled: props.disabled,
              onClick: props.onReset
            }, props.t("reset"))
          )
        ),
        (0, import_react.createElement)("div", { style: selectStackStyle }, props.children),
        (0, import_react.createElement)(
          "p",
          { style: props.invalid ? fieldInvalidStyle : settingsHintStyle },
          props.invalid ? props.invalidLabel : props.hint
        )
      );
    }
    function ProviderSettingsPage(props) {
      const { t, provider } = props;
      const { scope, status } = useConfigScope(props.ctx, provider.rowId);
      if (props.view === "summary") return (0, import_react.createElement)("p", null, t(provider.summary));
      return settingsState(t, status) ?? (0, import_react.createElement)(ProviderSettingsForm, { t, provider, scope, ctx: props.ctx });
    }
    function ProviderSettingsForm(props) {
      const { t, provider, ctx } = props;
      const [credential, setCredential] = (0, import_react.useState)({ available: true, configured: false, writable: true });
      const refresh = (0, import_react.useCallback)(async () => {
        try {
          const response = await ctx.remote.credentials.describe([provider.keyRef]);
          if (!response.ok) {
            setCredential((current) => ({ ...current, available: false }));
            return;
          }
          const info = response.value[provider.keyRef];
          setCredential({
            available: true,
            configured: info?.configured ?? false,
            writable: info?.writable ?? true
          });
        } catch {
          setCredential((current) => ({ ...current, available: false }));
        }
      }, [ctx, provider.keyRef]);
      (0, import_react.useEffect)(() => {
        void refresh();
        return ctx.remote.$on("credentials/reference-updated", (ref) => {
          if (ref === provider.keyRef) void refresh();
        });
      }, [ctx, provider.keyRef, refresh]);
      const specs = (0, import_react.useMemo)(
        () => provider.accountId ? [endpointSpec, accountIdSpec] : [endpointSpec],
        [provider]
      );
      const secrets = (0, import_react.useMemo)(() => [{
        field: "apiKey",
        write: async (text) => {
          const response = await ctx.remote.credentials.set(provider.keyRef, text);
          await refresh();
          return response.ok;
        }
      }], [ctx, provider.keyRef, refresh]);
      const { view, actions } = useSettingsForm(props.scope, specs, secrets);
      const disabled = !view.shell.writable;
      const accountId = provider.accountId;
      return (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsForm, {
        labels: settingsFormLabels(t),
        state: view.shell,
        onSave: actions.save,
        onDiscard: actions.discard,
        children: [
          (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsSecretField, {
            key: "key",
            id: `dsh-system1-${provider.id}-api-key`,
            label: t("key"),
            hint: !credential.available ? t("keyUnavailable") : !credential.writable ? t("keyReadOnly") : t(provider.keyHint),
            disabled: !credential.available || !credential.writable,
            text: view.fields.apiKey.text,
            configured: credential.available && credential.configured,
            stateLabel: !credential.available ? t("keyStatusUnavailable") : credential.configured ? t("keyStatusConfigured") : t("keyStatusMissing"),
            onEdit: (text) => actions.edit("apiKey", text)
          }),
          (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsValueField, {
            key: "endpoint",
            id: `dsh-system1-${provider.id}-endpoint`,
            label: t(provider.endpointLabel),
            hint: t(provider.endpointHint),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidEndpoint"),
            placeholder: provider.baseURL,
            disabled,
            ...view.fields.baseURL,
            onEdit: (text) => actions.edit("baseURL", text),
            onReset: () => actions.resetField("baseURL")
          }),
          accountId && (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsValueField, {
            key: "account",
            id: `dsh-system1-${provider.id}-${accountId.path}`,
            label: t(accountId.label),
            hint: t(accountId.hint),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidAccountId"),
            disabled,
            ...view.fields[accountId.path],
            onEdit: (text) => actions.edit(accountId.path, text),
            onReset: () => actions.resetField(accountId.path)
          })
        ]
      });
    }
    var endpointSpec = {
      field: "baseURL",
      format: (value) => typeof value === "string" ? value : "",
      parse: (text) => {
        if (text.trim() === "") return { kind: "clear" };
        const normalized = normalizeEndpoint(text);
        return normalized ? { kind: "set", value: normalized } : void 0;
      }
    };
    var accountIdSpec = {
      field: "accountId",
      format: (value) => typeof value === "string" ? value : "",
      parse: (text) => {
        const normalized = normalizeCloudflareAccountId(text);
        if (normalized === void 0) return void 0;
        return normalized === "" ? { kind: "clear" } : { kind: "set", value: normalized };
      }
    };
    function parseJson(text) {
      try {
        return JSON.parse(text);
      } catch {
        return void 0;
      }
    }
    function parseModelRow(text) {
      const row = objectValue(parseJson(text));
      return typeof row.provider === "string" && row.provider.trim() !== "" && typeof row.model === "string" && row.model.trim() !== "" ? { provider: row.provider.trim(), model: row.model.trim() } : void 0;
    }
    function settingsFormLabels(t) {
      return {
        unavailable: t("unavailable"),
        readOnly: t("readOnly"),
        saveFailed: t("saveFailed"),
        save: t("save"),
        saving: t("saving")
      };
    }
    function settingsState(t, status) {
      if (status === "loading") return (0, import_react.createElement)("p", { role: "status", style: settingsHintStyle }, t("loading"));
      if (status === "unavailable" || status === void 0)
        return (0, import_react.createElement)("p", { role: "note", style: settingsHintStyle }, t("unavailable"));
      return null;
    }
    function objectValue(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    function normalizeEndpoint(value) {
      const normalized = value.trim().replace(/\/+$/u, "");
      try {
        const parsed = new URL(normalized);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") return normalized;
      } catch {
        return void 0;
      }
      return void 0;
    }
    function normalizeCloudflareAccountId(value) {
      const normalized = value.trim();
      return normalized.length === 0 || normalized.length === 32 ? normalized : void 0;
    }
    var fieldStyle = { display: "flex", flexDirection: "column", gap: 6, padding: "12px 0" };
    var fieldHeadStyle = { display: "flex", alignItems: "center", gap: 8 };
    var fieldLabelStyle = {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-primary)"
    };
    var fieldBadgesStyle = { display: "inline-flex", alignItems: "center", gap: 8 };
    var fieldResetStyle = {
      border: "none",
      background: "none",
      padding: 0,
      font: "inherit",
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-secondary)",
      cursor: "pointer"
    };
    var fieldInvalidStyle = {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-state-error-primary)"
    };
    var dropdownTriggerStyle = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      width: "100%",
      minWidth: 0,
      height: 36,
      padding: "0 14px",
      border: "none",
      borderRadius: "var(--dsw-radius-md)",
      background: "var(--dsw-alias-bg-module-platform)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      fontSize: 14,
      lineHeight: "22px",
      whiteSpace: "nowrap",
      cursor: "pointer"
    };
    var dropdownLabelStyle = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" };
    var dropdownInvalidStyle = { boxShadow: "inset 0 0 0 1px var(--dsw-alias-state-error-primary)" };
    var dropdownDisabledStyle = { color: "var(--dsw-alias-label-tertiary)", cursor: "default" };
    var modelPairStyle = {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      flex: 1,
      minWidth: 0
    };
    var selectStackStyle = { display: "flex", flexDirection: "column", gap: 8 };
    var fallbackRowStyle = { display: "flex", alignItems: "center", gap: 8 };
    var settingsHintStyle = {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-tertiary)"
    };

    return module.exports;
  },
});
