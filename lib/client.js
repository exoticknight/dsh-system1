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
    var NS = "dsh-system1";
    var PACKAGE = "dsh-system1";
    var en = {
      coreSummary: "Choose the default service and model, then set the shared request timeout.",
      provider: "Default service",
      providerTypesafe: "TypeSafe (Jev)",
      providerLaya: "Laya",
      providerUnknown: "Unsupported service",
      model: "Default model",
      timeout: "Request timeout (ms)",
      defaultHint: "Used when a decision request does not specify a model.",
      timeoutHint: "Applies when a decision request does not provide its own timeout.",
      providerEnabledHint: "Enable the matching service component in the list below.",
      reset: "Reset to package default",
      save: "Save settings",
      saving: "Saving\u2026",
      saved: "Settings saved.",
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
      keySave: "Save API Key",
      keyClear: "Clear API Key",
      keySaving: "Updating credential\u2026",
      keySaved: "API Key saved.",
      keyCleared: "API Key cleared.",
      keySaveFailed: "DSH could not update the credential. Check whether its source is writable.",
      keyRequired: "Enter an API Key before saving.",
      typesafeSummary: "Configure the TypeSafe endpoint and its API Key.",
      layaSummary: "Configure the Laya endpoint and optional API Key.",
      typesafeEndpoint: "TypeSafe API base URL",
      typesafeEndpointHint: "The TypeSafe System One endpoint is appended automatically.",
      layaEndpoint: "Laya server base URL",
      layaEndpointHint: "Use the base URL of a Laya server exposing POST /v1/systemone.",
      invalidEndpoint: "Enter a full HTTP or HTTPS URL.",
      modelAuto: "Auto route by language",
      modelEnglish: "English checkpoint",
      modelMultilingual: "Multilingual checkpoint",
      modelTypedDecisions: "Typed-decisions checkpoint"
    };
    var zh = {
      coreSummary: "\u9009\u62E9\u9ED8\u8BA4\u670D\u52A1\u548C\u6A21\u578B\uFF0C\u5E76\u8BBE\u7F6E\u901A\u7528\u8BF7\u6C42\u8D85\u65F6\u3002",
      provider: "\u9ED8\u8BA4\u670D\u52A1",
      providerTypesafe: "TypeSafe\uFF08Jev\uFF09",
      providerLaya: "Laya",
      providerUnknown: "\u6682\u4E0D\u652F\u6301\u7684\u670D\u52A1",
      model: "\u9ED8\u8BA4\u6A21\u578B",
      timeout: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
      defaultHint: "\u51B3\u7B56\u8BF7\u6C42\u672A\u6307\u5B9A\u6A21\u578B\u65F6\u4F7F\u7528\u3002",
      timeoutHint: "\u51B3\u7B56\u8BF7\u6C42\u6CA1\u6709\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002",
      providerEnabledHint: "\u8BF7\u5728\u4E0B\u65B9\u7EC4\u4EF6\u5217\u8868\u4E2D\u542F\u7528\u5BF9\u5E94\u7684\u670D\u52A1\u7EC4\u4EF6\u3002",
      reset: "\u6062\u590D\u9ED8\u8BA4\u503C",
      save: "\u4FDD\u5B58\u8BBE\u7F6E",
      saving: "\u4FDD\u5B58\u4E2D\u2026",
      saved: "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u3002",
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
      keySave: "\u4FDD\u5B58 API Key",
      keyClear: "\u6E05\u9664 API Key",
      keySaving: "\u6B63\u5728\u66F4\u65B0\u51ED\u636E\u2026",
      keySaved: "API Key \u5DF2\u4FDD\u5B58\u3002",
      keyCleared: "API Key \u5DF2\u6E05\u9664\u3002",
      keySaveFailed: "DSH \u672A\u80FD\u66F4\u65B0\u51ED\u636E\uFF0C\u8BF7\u786E\u8BA4\u51ED\u636E\u6765\u6E90\u662F\u5426\u53EF\u5199\u3002",
      keyRequired: "\u8BF7\u5148\u586B\u5199 API Key\u3002",
      typesafeSummary: "\u914D\u7F6E TypeSafe \u63A5\u53E3\u5730\u5740\u548C API Key\u3002",
      layaSummary: "\u914D\u7F6E Laya \u63A5\u53E3\u5730\u5740\u548C\u53EF\u9009 API Key\u3002",
      typesafeEndpoint: "TypeSafe API \u6839\u5730\u5740",
      typesafeEndpointHint: "\u63D2\u4EF6\u4F1A\u81EA\u52A8\u5728\u5730\u5740\u540E\u62FC\u63A5 TypeSafe System One \u63A5\u53E3\u8DEF\u5F84\u3002",
      layaEndpoint: "Laya \u670D\u52A1\u6839\u5730\u5740",
      layaEndpointHint: "\u586B\u5199\u63D0\u4F9B POST /v1/systemone \u63A5\u53E3\u7684 Laya \u670D\u52A1\u6839\u5730\u5740\u3002",
      invalidEndpoint: "\u8BF7\u8F93\u5165\u5B8C\u6574\u7684 HTTP \u6216 HTTPS \u5730\u5740\u3002",
      modelAuto: "\u6309\u8BED\u8A00\u81EA\u52A8\u8DEF\u7531",
      modelEnglish: "\u82F1\u6587\u6A21\u578B",
      modelMultilingual: "\u591A\u8BED\u8A00\u6A21\u578B",
      modelTypedDecisions: "\u7C7B\u578B\u5316\u51B3\u7B56\u6A21\u578B"
    };
    var PROVIDERS = [
      {
        id: "typesafe",
        rowId: "system1-typesafe",
        keyRef: "TYPESAFE_API_KEY",
        models: [{ id: "jev-latest" }, { id: "jev-preview" }, { id: "jev-1.13.0" }]
      },
      {
        id: "laya",
        rowId: "system1-laya",
        keyRef: "LAYA_API_KEY",
        models: [
          { id: "auto", label: "modelAuto" },
          { id: "english", label: "modelEnglish" },
          { id: "multilingual", label: "modelMultilingual" },
          { id: "typed-decisions", label: "modelTypedDecisions" }
        ]
      }
    ];
    var inject = ["slots", "locale", "remote", "configForms"];
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
    function BundleSettingsPage(props) {
      const form = (0, import_react.useMemo)(() => props.ctx.configForms.get("system1"), [props.ctx]);
      const subscribe = (0, import_react.useCallback)((listener) => form.subscribe(listener), [form]);
      const getSnapshot = (0, import_react.useCallback)(() => form.getSnapshot(), [form]);
      const state = (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
      const value = objectValue(state.value);
      const t = props.t;
      const [provider, setProvider] = (0, import_react.useState)("typesafe");
      const [model, setModel] = (0, import_react.useState)("jev-latest");
      const [timeout, setTimeout] = (0, import_react.useState)("800");
      const [resetModel, setResetModel] = (0, import_react.useState)(false);
      const [resetTimeout, setResetTimeout] = (0, import_react.useState)(false);
      const [saving, setSaving] = (0, import_react.useState)(false);
      const [notice, setNotice] = (0, import_react.useState)("");
      const [error, setError] = (0, import_react.useState)("");
      (0, import_react.useEffect)(() => {
        const currentModel2 = objectValue(value.defaultModel);
        setProvider(typeof currentModel2.provider === "string" ? currentModel2.provider : "typesafe");
        setModel(typeof currentModel2.model === "string" ? currentModel2.model : "jev-latest");
        setTimeout(typeof value.timeoutMs === "number" ? String(value.timeoutMs) : "800");
        setResetModel(false);
        setResetTimeout(false);
      }, [state.revision, state.status, state.value]);
      const pageState = settingsState(t, state.status);
      if (props.view === "summary") return (0, import_react.createElement)("p", null, t("coreSummary"));
      if (pageState) return pageState;
      const canSave = state.writable && state.revision !== void 0;
      const currentModel = objectValue(value.defaultModel);
      const modelDirty = resetModel || provider !== (typeof currentModel.provider === "string" ? currentModel.provider : "") || model !== (typeof currentModel.model === "string" ? currentModel.model : "");
      const timeoutDirty = resetTimeout || timeout !== String(typeof value.timeoutMs === "number" ? value.timeoutMs : 800);
      const providerInfo = PROVIDERS.find((candidate) => candidate.id === provider);
      const models = providerInfo?.models ?? [];
      const modelIsListed = models.some((candidate) => candidate.id === model);
      const parsedTimeout = Number(timeout);
      const selectionInvalid = !provider.trim() || !model.trim();
      const timeoutInvalid = !resetTimeout && (!Number.isInteger(parsedTimeout) || parsedTimeout < 1 || parsedTimeout > 2147483647);
      const validationError = error || (selectionInvalid ? t("required") : timeoutInvalid ? t("invalidTimeout") : "");
      const saveSettings = async () => {
        setNotice("");
        setError("");
        if (!provider.trim() || !model.trim()) {
          setError(t("required"));
          return;
        }
        if (!resetTimeout && (!Number.isInteger(parsedTimeout) || parsedTimeout < 1 || parsedTimeout > 2147483647)) {
          setError(t("invalidTimeout"));
          return;
        }
        const operations = [];
        if (modelDirty) {
          if (resetModel) operations.push({ op: "unset", path: ["defaultModel"] });
          else operations.push({
            op: "set",
            path: ["defaultModel"],
            value: { provider: provider.trim(), model: model.trim() }
          });
        }
        if (timeoutDirty) {
          if (resetTimeout) operations.push({ op: "unset", path: ["timeoutMs"] });
          else operations.push({ op: "set", path: ["timeoutMs"], value: parsedTimeout });
        }
        if (!operations.length || state.revision === void 0) return;
        setSaving(true);
        try {
          if (await form.mutate(operations, state.revision)) setNotice(t("saved"));
          else setError(t("saveFailed"));
        } catch {
          setError(t("saveFailed"));
        } finally {
          setSaving(false);
        }
      };
      const selectProvider = (nextProvider) => {
        const nextInfo = PROVIDERS.find((candidate) => candidate.id === nextProvider);
        setProvider(nextProvider);
        setModel(nextInfo?.models[0]?.id ?? "");
        setResetModel(false);
      };
      const base = objectValue(state.base);
      const baseModel = objectValue(base.defaultModel);
      const resetToModel = () => {
        setProvider(typeof baseModel.provider === "string" ? baseModel.provider : "typesafe");
        setModel(typeof baseModel.model === "string" ? baseModel.model : "jev-latest");
        setResetModel(true);
      };
      const resetToTimeout = () => {
        setTimeout(typeof base.timeoutMs === "number" ? String(base.timeoutMs) : "800");
        setResetTimeout(true);
      };
      const formState = {
        available: true,
        writable: canSave,
        dirty: modelDirty || timeoutDirty,
        invalid: selectionInvalid || timeoutInvalid,
        saving,
        failed: false
      };
      return (0, import_react.createElement)(
        "section",
        { className: "dsh-system1-config" },
        (0, import_react.createElement)(
          import_dsh_client_ui_primitives.SettingsForm,
          {
            state: formState,
            labels: settingsFormLabels(t),
            onSave: saveSettings,
            onDiscard: () => {
            },
            children: null
          },
          field("dsh-system1-provider", t("provider"), (0, import_react.createElement)(
            "select",
            {
              id: "dsh-system1-provider",
              name: "provider",
              value: provider,
              disabled: !canSave || saving,
              style: selectStyle,
              onChange: (event) => {
                setError("");
                selectProvider(event.currentTarget.value);
              }
            },
            !providerInfo && (0, import_react.createElement)("option", { value: provider }, `${t("providerUnknown")}: ${provider}`),
            PROVIDERS.map((entry) => (0, import_react.createElement)("option", {
              key: entry.id,
              value: entry.id
            }, t(entry.id === "typesafe" ? "providerTypesafe" : "providerLaya")))
          ), t("defaultHint"), void 0, true),
          field("dsh-system1-model", t("model"), (0, import_react.createElement)(
            "select",
            {
              id: "dsh-system1-model",
              name: "model",
              value: model,
              disabled: !canSave || saving || !providerInfo,
              style: selectStyle,
              onChange: (event) => {
                setError("");
                setModel(event.currentTarget.value);
              }
            },
            !modelIsListed && model && (0, import_react.createElement)("option", { value: model }, model),
            models.map((entry) => (0, import_react.createElement)(
              "option",
              { key: entry.id, value: entry.id },
              entry.label ? t(entry.label) : entry.id
            ))
          ), t("defaultHint"), resetAction(t, t("model"), resetToModel, !canSave || saving)),
          field("dsh-system1-timeout", t("timeout"), (0, import_react.createElement)("input", {
            id: "dsh-system1-timeout",
            name: "timeoutMs",
            type: "number",
            min: 1,
            max: 2147483647,
            step: 1,
            value: timeout,
            disabled: !canSave || saving,
            style: inputStyle,
            onChange: (event) => {
              setError("");
              setTimeout(event.currentTarget.value);
            }
          }), t("timeoutHint"), resetAction(t, t("timeout"), resetToTimeout, !canSave || saving)),
          (0, import_react.createElement)("p", { role: "note", style: settingsNoteStyle }, t("providerEnabledHint")),
          statusMessage(notice, validationError)
        )
      );
    }
    function ProviderSettingsPage(props) {
      const form = props.form;
      const state = form?.state;
      const value = objectValue(state?.value);
      const base = objectValue(state?.base);
      const { provider, t } = props;
      const [baseURL, setBaseURL] = (0, import_react.useState)(provider.id === "typesafe" ? "https://api.typesafe.ai" : "http://127.0.0.1:8000");
      const [saving, setSaving] = (0, import_react.useState)(false);
      const [notice, setNotice] = (0, import_react.useState)("");
      const [error, setError] = (0, import_react.useState)("");
      const [secret, setSecret] = (0, import_react.useState)("");
      const [savingSecret, setSavingSecret] = (0, import_react.useState)(false);
      const [secretNotice, setSecretNotice] = (0, import_react.useState)("");
      const [secretError, setSecretError] = (0, import_react.useState)("");
      const [credentialConfigured, setCredentialConfigured] = (0, import_react.useState)(false);
      const [credentialWritable, setCredentialWritable] = (0, import_react.useState)(true);
      const [credentialLoading, setCredentialLoading] = (0, import_react.useState)(true);
      const [credentialAvailable, setCredentialAvailable] = (0, import_react.useState)(true);
      const credentialGeneration = (0, import_react.useRef)(0);
      (0, import_react.useEffect)(() => {
        setBaseURL(typeof value.baseURL === "string" ? value.baseURL : provider.id === "typesafe" ? "https://api.typesafe.ai" : "http://127.0.0.1:8000");
      }, [provider.id, state?.revision, state?.status, state?.value]);
      const refreshCredential = (0, import_react.useCallback)(async () => {
        const generation = ++credentialGeneration.current;
        setCredentialLoading(true);
        try {
          const response = await props.ctx.remote.credentials.describe([provider.keyRef]);
          if (generation !== credentialGeneration.current) return;
          if (!response.ok) {
            setCredentialAvailable(false);
            return;
          }
          const credential = response.value[provider.keyRef];
          setCredentialConfigured(credential?.configured ?? false);
          setCredentialWritable(credential?.writable ?? true);
          setCredentialAvailable(true);
        } catch {
          if (generation === credentialGeneration.current) setCredentialAvailable(false);
        } finally {
          if (generation === credentialGeneration.current) setCredentialLoading(false);
        }
      }, [props.ctx, provider.keyRef]);
      (0, import_react.useEffect)(() => {
        void refreshCredential();
        const dispose = props.ctx.remote.$on("credentials/reference-updated", (updatedRef) => {
          if (updatedRef === provider.keyRef) void refreshCredential();
        });
        return () => {
          credentialGeneration.current += 1;
          dispose();
        };
      }, [props.ctx, provider.keyRef, refreshCredential]);
      const pageState = settingsState(t, state?.status);
      if (props.view === "summary") return (0, import_react.createElement)("p", null, t(provider.id === "typesafe" ? "typesafeSummary" : "layaSummary"));
      if (pageState) return pageState;
      const canSave = Boolean(form && state?.writable && state.revision !== void 0);
      const defaultBaseURL = typeof base.baseURL === "string" ? base.baseURL : provider.id === "typesafe" ? "https://api.typesafe.ai" : "http://127.0.0.1:8000";
      const currentBaseURL = typeof value.baseURL === "string" ? value.baseURL : defaultBaseURL;
      const baseURLDirty = baseURL.trim() !== currentBaseURL;
      const saveSettings = async () => {
        setNotice("");
        setError("");
        const normalized = normalizeEndpoint(baseURL);
        if (!normalized) {
          setError(t("invalidEndpoint"));
          return;
        }
        if (!baseURLDirty || !form || state?.revision === void 0) return;
        setSaving(true);
        try {
          if (await form.mutate([{ op: "set", path: ["baseURL"], value: normalized }], state.revision))
            setNotice(t("saved"));
          else setError(t("saveFailed"));
        } catch {
          setError(t("saveFailed"));
        } finally {
          setSaving(false);
        }
      };
      const saveSecret = async () => {
        setSecretNotice("");
        setSecretError("");
        if (!secret.trim()) {
          setSecretError(t("keyRequired"));
          return;
        }
        setSavingSecret(true);
        try {
          const response = await props.ctx.remote.credentials.set(provider.keyRef, secret.trim());
          if (!response.ok) setSecretError(t("keySaveFailed"));
          else {
            setSecret("");
            setSecretNotice(t("keySaved"));
            await refreshCredential();
          }
        } catch {
          setSecretError(t("keySaveFailed"));
        } finally {
          setSavingSecret(false);
        }
      };
      const clearSecret = async () => {
        setSecretNotice("");
        setSecretError("");
        setSavingSecret(true);
        try {
          const response = await props.ctx.remote.credentials.unset(provider.keyRef);
          if (!response.ok) setSecretError(t("keySaveFailed"));
          else {
            setSecret("");
            setSecretNotice(t("keyCleared"));
            await refreshCredential();
          }
        } catch {
          setSecretError(t("keySaveFailed"));
        } finally {
          setSavingSecret(false);
        }
      };
      const endpointLabel = provider.id === "typesafe" ? "typesafeEndpoint" : "layaEndpoint";
      const endpointHint = provider.id === "typesafe" ? "typesafeEndpointHint" : "layaEndpointHint";
      const keyHint = provider.id === "typesafe" ? "keyHint" : "layaKeyHint";
      const normalizedBaseURL = normalizeEndpoint(baseURL);
      const endpointInvalid = baseURLDirty && !normalizedBaseURL;
      const endpointMessage = error || (endpointInvalid ? t("invalidEndpoint") : "");
      const endpointFormState = {
        available: true,
        writable: canSave,
        dirty: baseURLDirty,
        invalid: endpointInvalid,
        saving,
        failed: false
      };
      return (0, import_react.createElement)(
        "section",
        { className: "dsh-system1-provider-config", style: providerSettingsStyle },
        (0, import_react.createElement)(
          import_dsh_client_ui_primitives.SettingsForm,
          {
            state: endpointFormState,
            labels: settingsFormLabels(t),
            onSave: saveSettings,
            onDiscard: () => {
            },
            children: null
          },
          field(`dsh-system1-${provider.id}-endpoint`, t(endpointLabel), (0, import_react.createElement)("input", {
            id: `dsh-system1-${provider.id}-endpoint`,
            name: "baseURL",
            type: "url",
            value: baseURL,
            autoComplete: "url",
            disabled: !canSave || saving,
            style: inputStyle,
            onChange: (event) => {
              setError("");
              setBaseURL(event.currentTarget.value);
            }
          }), t(endpointHint), resetAction(t, t(endpointLabel), () => setBaseURL(defaultBaseURL), !canSave || saving), true),
          statusMessage(notice, endpointMessage)
        ),
        (0, import_react.createElement)(
          "section",
          { style: credentialSectionStyle },
          credentialLoading ? (0, import_react.createElement)("p", { role: "status", style: settingsHintStyle }, t("loading")) : (0, import_react.createElement)(import_dsh_client_ui_primitives.SettingsSecretField, {
            id: `dsh-system1-${provider.id}-api-key`,
            label: t("key"),
            hint: t(keyHint),
            text: secret,
            configured: credentialAvailable && credentialConfigured,
            stateLabel: !credentialAvailable ? t("keyStatusUnavailable") : credentialConfigured ? t("keyStatusConfigured") : t("keyStatusMissing"),
            disabled: !credentialAvailable || !credentialWritable || savingSecret,
            onEdit: (nextSecret) => {
              setSecret(nextSecret);
              setSecretError("");
            }
          }),
          !credentialAvailable && !credentialLoading && (0, import_react.createElement)("p", {
            role: "note",
            style: settingsHintStyle
          }, t("keyUnavailable")),
          !credentialWritable && (0, import_react.createElement)("p", { role: "note", style: settingsHintStyle }, t("keyReadOnly")),
          statusMessage(secretNotice, secretError),
          (0, import_react.createElement)(
            "div",
            { style: settingsFooterStyle },
            (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
              type: "button",
              size: "sm",
              variant: "primary",
              disabled: !credentialAvailable || !credentialWritable || credentialLoading || savingSecret || !secret.trim(),
              onClick: saveSecret
            }, savingSecret ? t("keySaving") : t("keySave")),
            (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: !credentialAvailable || !credentialWritable || credentialLoading || savingSecret || !credentialConfigured,
              onClick: clearSecret
            }, t("keyClear"))
          )
        )
      );
    }
    function field(id, label, control, hint, action, first = false) {
      return (0, import_react.createElement)(
        "div",
        { style: first ? { ...settingsFieldStyle, borderTop: "none" } : settingsFieldStyle },
        (0, import_react.createElement)(
          "div",
          { style: settingsFieldHeadStyle },
          (0, import_react.createElement)("label", { htmlFor: id, style: settingsLabelStyle }, label),
          action
        ),
        control,
        (0, import_react.createElement)("p", { style: settingsHintStyle }, hint)
      );
    }
    function resetAction(t, label, onClick, disabled) {
      return (0, import_react.createElement)("button", {
        type: "button",
        disabled,
        "aria-label": `${label}: ${t("reset")}`,
        onClick,
        style: resetButtonStyle
      }, t("reset"));
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
    function statusMessage(notice, error) {
      if (error) return (0, import_react.createElement)("p", { role: "alert", style: errorMessageStyle }, error);
      if (notice) return (0, import_react.createElement)("p", { role: "status", style: successMessageStyle }, notice);
      return null;
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
    var inputStyle = {
      boxSizing: "border-box",
      width: "100%",
      height: 34,
      padding: "0 12px",
      border: "0.5px solid var(--dsw-alias-border-l4)",
      borderRadius: 8,
      background: "var(--dsw-alias-bg-layer-3)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      fontSize: 13,
      lineHeight: 1.5
    };
    var selectStyle = {
      minWidth: 0,
      ...inputStyle
    };
    var providerSettingsStyle = { display: "flex", flexDirection: "column" };
    var settingsFieldStyle = {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "12px 0",
      borderTop: "0.5px solid var(--dsw-alias-border-l2)"
    };
    var settingsFieldHeadStyle = { display: "flex", alignItems: "center", gap: 8 };
    var settingsLabelStyle = {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-primary)"
    };
    var settingsHintStyle = {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-tertiary)"
    };
    var settingsNoteStyle = {
      margin: "12px 0 0",
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-secondary)"
    };
    var resetButtonStyle = {
      border: "none",
      background: "none",
      padding: 0,
      font: "inherit",
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-secondary)",
      cursor: "pointer"
    };
    var settingsFooterStyle = { display: "flex", alignItems: "center", gap: 8, paddingTop: 16 };
    var credentialSectionStyle = {
      borderTop: "0.5px solid var(--dsw-alias-border-l2)",
      paddingTop: 12
    };
    var errorMessageStyle = {
      margin: 0,
      fontSize: 12,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-error)"
    };
    var successMessageStyle = { ...settingsHintStyle, color: "var(--dsw-alias-label-secondary)" };

    return module.exports;
  },
});
