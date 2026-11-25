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
    var import_react2 = require("react");

    // src/providers/liquid/models.ts
    var LIQUID_BASE_URL = "https://api.liquid.ai/decisions";

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/util.js
    function jsonStringifyReplacer(_, value) {
      if (typeof value === "bigint")
        return value.toString();
      return value;
    }
    var Cached = class {
      constructor(getter) {
        this._getter = getter;
        this._value = void 0;
      }
      get value() {
        const getter = this._getter;
        if (getter !== void 0) {
          this._value = getter();
          this._getter = void 0;
        }
        return this._value;
      }
    };
    function cached(getter) {
      return new Cached(getter);
    }
    function cleanRegex(source) {
      const start = source.startsWith("^") ? 1 : 0;
      const end = source.endsWith("$") ? source.length - 1 : source.length;
      return source.slice(start, end);
    }
    function assignProp(target, prop, value) {
      Object.defineProperty(target, prop, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    function rawShape(def) {
      const desc = Object.getOwnPropertyDescriptor(def, "shape");
      return desc?.get ? desc.get.raw : desc?.value;
    }
    var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
    };
    function isObject(data) {
      return typeof data === "object" && data !== null && !Array.isArray(data);
    }
    function isPlainObject(o) {
      if (isObject(o) === false)
        return false;
      const ctor = o.constructor;
      if (ctor === void 0)
        return true;
      if (typeof ctor !== "function")
        return true;
      const prot = ctor.prototype;
      if (isObject(prot) === false)
        return false;
      if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
        return false;
      }
      return true;
    }
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    function clone(inst, def, params) {
      const cl = new inst._zod.constr(def ?? inst._zod.def);
      if (!def || params?.parent)
        cl._zod.parent = inst;
      return cl;
    }
    function normalizeParams(_params) {
      const params = _params;
      if (!params)
        return {};
      if (typeof params === "string")
        return { error: () => params };
      if (params?.message !== void 0) {
        if (params?.error !== void 0)
          throw new Error("Cannot specify both `message` and `error` params");
        params.error = params.message;
      }
      delete params.message;
      if (typeof params.error === "string")
        return { ...params, error: () => params.error };
      return params;
    }
    function optionalKeys(shape) {
      return Object.keys(shape).filter((k) => {
        return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
      });
    }
    function aborted(x, startIndex = 0) {
      if (x.aborted === true)
        return true;
      for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue !== true) {
          return true;
        }
      }
      return false;
    }
    function explicitlyAborted(x, startIndex = 0) {
      if (x.aborted === true)
        return true;
      for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue === false) {
          return true;
        }
      }
      return false;
    }
    function prefixIssues(path, issues) {
      return issues.map((iss) => {
        var _a2;
        (_a2 = iss).path ?? (_a2.path = []);
        iss.path.unshift(path);
        return iss;
      });
    }
    function unwrapMessage(message) {
      return typeof message === "string" ? message : message?.message;
    }
    function attachSchema(issues, start, inst) {
      var _a2;
      for (let i = start; i < issues.length; i++) {
        (_a2 = issues[i]).schema ?? (_a2.schema = inst);
      }
    }
    function finalizeIssue(iss, ctx, config2) {
      var _a2;
      const traits = iss.inst?._zod?.traits;
      if (traits?.has("$ZodType")) {
        if (traits.has("$ZodCheck"))
          (_a2 = iss).schema ?? (_a2.schema = iss.inst);
        else
          iss.schema = iss.inst;
      }
      const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
      const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
      const full = {};
      for (const k of Object.keys(iss)) {
        if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
          continue;
        full[k] = iss[k];
      }
      full.path ?? (full.path = []);
      full.message = message;
      if (ctx?.reportInput) {
        full.input = iss.input;
      }
      return full;
    }
    function members(proto, table) {
      for (const key in table) {
        const desc = Object.getOwnPropertyDescriptor(table, key);
        if (desc.get)
          Object.defineProperty(proto, key, { ...desc, enumerable: false });
        else
          defineBound(proto, key, desc.value);
      }
    }
    function own(inst, key, value, enumerable = true) {
      Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
      return value;
    }
    function hide(inst, key, value) {
      return own(inst, key, value, false);
    }
    function defineBound(proto, key, fn) {
      Object.defineProperty(proto, key, {
        configurable: true,
        get() {
          return this == null ? fn : own(this, key, fn.bind(this));
        },
        set(value) {
          own(this, key, value);
        }
      });
    }
    function claim(inst, sentinel) {
      const proto = Object.getPrototypeOf(inst);
      return sentinel in proto ? void 0 : proto;
    }
    var installing;
    var broke = false;
    var breaker = {
      configurable: true,
      get() {
        broke = true;
        return void 0;
      }
    };
    function defineLazyInternal(inst, key, compute) {
      const proto = Object.getPrototypeOf(inst._zod);
      if (key in proto && installing !== inst._zod) {
        installing = void 0;
        return;
      }
      installing = inst._zod;
      Object.defineProperty(proto, key, {
        configurable: true,
        get() {
          Object.defineProperty(this, key, breaker);
          const outer = broke;
          broke = false;
          try {
            const value = compute(this);
            if (broke)
              delete this[key];
            else
              Object.defineProperty(this, key, { configurable: true, writable: true, value });
            broke = broke || outer;
            return value;
          } catch (err) {
            delete this[key];
            broke = broke || outer;
            throw err;
          }
        },
        set(value) {
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        }
      });
    }
    function installLazyProp(inst, key, make, enumerable) {
      const proto = claim(inst, key);
      if (!proto)
        return;
      Object.defineProperty(proto, key, {
        configurable: true,
        get() {
          const desc = { configurable: true, writable: true, enumerable, value: void 0 };
          Object.defineProperty(this, key, desc);
          desc.value = make(this);
          Object.defineProperty(this, key, desc);
          return desc.value;
        },
        set(value) {
          Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
        }
      });
    }

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/core.js
    var _a;
    var _zodDesc = { value: void 0, enumerable: false };
    var _E = "captureStackTrace" in Error ? Error : null;
    function newError(Definition) {
      const E = _E;
      if (E) {
        const saved = E.stackTraceLimit;
        if (typeof saved === "number") {
          try {
            E.stackTraceLimit = 0;
          } catch {
            _E = null;
            return new Definition();
          }
          try {
            return new Definition();
          } finally {
            E.stackTraceLimit = saved;
          }
        }
      }
      return new Definition();
    }
    // @__NO_SIDE_EFFECTS__
    function $constructor(name, initializer2, proto, params) {
      const zodProto = {};
      function Internals(def) {
        this.def = def;
        this.constr = _;
        this.traits = /* @__PURE__ */ new Set();
      }
      Internals.prototype = zodProto;
      const protoMembers = proto;
      const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
      function init(inst, def) {
        if (!inst._zod) {
          _zodDesc.value = new Internals(def);
          try {
            Object.defineProperty(inst, "_zod", _zodDesc);
          } finally {
            _zodDesc.value = void 0;
          }
        } else if (inst._zod.traits.has(name)) {
          return;
        }
        inst._zod.traits.add(name);
        initializer2(inst, def);
        if (initialized) {
          const own2 = Object.getPrototypeOf(inst);
          const ctorProto = inst._zod.constr.prototype;
          let up = own2;
          while (up && up !== ctorProto)
            up = Object.getPrototypeOf(up);
          const target = up ?? own2;
          if (!initialized.has(target)) {
            initialized.add(target);
            members(target, protoMembers);
          }
        }
        const proto2 = _.prototype;
        for (const k in proto2) {
          if (!Object.prototype.hasOwnProperty.call(proto2, k))
            continue;
          if (!(k in inst)) {
            inst[k] = proto2[k].bind(inst);
          }
        }
      }
      const Parent = params?.Parent ?? Object;
      class Definition extends Parent {
      }
      Object.defineProperty(Definition, "name", { value: name });
      function _(def) {
        const inst = params?.Parent ? newError(Definition) : this;
        init(inst, def);
        const deferred = inst._zod.deferred;
        if (deferred) {
          for (const fn of deferred) {
            fn();
          }
          inst._zod.deferred = void 0;
        }
        const pp = globalThis.__zod_globalConfig?.postProcessor;
        if (pp)
          pp(inst);
        return inst;
      }
      Object.defineProperty(_, "init", { value: init });
      Object.defineProperty(_, Symbol.hasInstance, {
        value: (inst) => {
          if (params?.Parent && inst instanceof params.Parent)
            return true;
          return inst?._zod?.traits?.has(name);
        }
      });
      Object.defineProperty(_, "name", { value: name });
      return _;
    }
    var $ZodAsyncError = class extends Error {
      constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
      }
    };
    (_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
    var globalConfig = globalThis.__zod_globalConfig;
    function config(newConfig) {
      if (newConfig)
        Object.assign(globalConfig, newConfig);
      return globalConfig;
    }

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/errors.js
    function _getMessage() {
      const internals = this._zod;
      internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
      return internals.message;
    }
    function _setMessage(value) {
      this._zod.message = value;
    }
    var _messageDesc = {
      get: _getMessage,
      set: _setMessage,
      enumerable: true,
      configurable: true
    };
    var _issuesDesc = { value: void 0, enumerable: false };
    var _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
    var initializer = (inst, def) => {
      inst.name = "$ZodError";
      _issuesDesc.value = def;
      Object.defineProperty(inst, "issues", _issuesDesc);
      _issuesDesc.value = void 0;
      Object.defineProperty(inst, "message", _messageDesc);
      const proto = Object.getPrototypeOf(inst);
      if (!_installedToString.has(proto)) {
        _installedToString.add(proto);
        Object.defineProperty(proto, "toString", {
          configurable: true,
          enumerable: false,
          get() {
            const value = () => this.message;
            Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
            return value;
          },
          set(value) {
            Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
          }
        });
      }
    };
    var $ZodError = $constructor("$ZodError", initializer);
    var $ZodRealError = $constructor("$ZodError", initializer, void 0, {
      Parent: Error
    });

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/parse.js
    var _parse = (_Err) => {
      const fn = (schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
        const result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise) {
          throw new $ZodAsyncError();
        }
        if (result.issues.length) {
          const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
          captureStackTrace(e, _params?.callee ?? fn);
          throw e;
        }
        return result.value;
      };
      return fn;
    };
    var parse = /* @__PURE__ */ _parse($ZodRealError);
    var _parseAsync = (_Err) => {
      const fn = async (schema, value, _ctx, params) => {
        const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
        let result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise)
          result = await result;
        if (result.issues.length) {
          const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
          captureStackTrace(e, params?.callee ?? fn);
          throw e;
        }
        return result.value;
      };
      return fn;
    };
    var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
    var _safeParse = (_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
      const result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise) {
        throw new $ZodAsyncError();
      }
      return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
    };
    var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
    function failure(Err, issues, ctx) {
      let error;
      return {
        success: false,
        get error() {
          if (!error) {
            error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
            issues = void 0;
            ctx = void 0;
          }
          return error;
        },
        set error(e) {
          error = e;
          issues = void 0;
          ctx = void 0;
        }
      };
    }
    var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
    };
    var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/regexes.js
    var anyString = /^[\s\S]{0,}$/;
    var number = /^-?\d+(?:\.\d+)?$/;
    var boolean = /^(?:true|false)$/i;

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/versions.js
    var version = {
      major: 4,
      minor: 6,
      patch: 5
    };

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/schemas.js
    var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
      var _a2;
      inst ?? (inst = {});
      inst._zod.def = def;
      inst._zod.bag = inst._zod.bag || {};
      inst._zod.version = version;
      const defChecks = inst._zod.def.checks;
      const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
      for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
          fn(inst);
        }
      }
      if (checks.length === 0) {
        (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
        inst._zod.deferred?.push(() => {
          inst._zod.run = inst._zod.parse;
        });
      } else {
        const runChecks = (payload, checks2, ctx) => {
          if (payload.memo)
            return payload;
          let isAborted = aborted(payload);
          let asyncResult;
          for (const ch of checks2) {
            if (ch._zod.def.when) {
              if (explicitlyAborted(payload))
                continue;
              const shouldRun = ch._zod.def.when(payload);
              if (!shouldRun)
                continue;
            } else if (isAborted) {
              continue;
            }
            const currLen = payload.issues.length;
            const _ = ch._zod.check(payload);
            if (_ instanceof Promise && ctx?.async === false) {
              throw new $ZodAsyncError();
            }
            if (asyncResult || _ instanceof Promise) {
              asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                await _;
                const nextLen = payload.issues.length;
                if (nextLen === currLen)
                  return;
                attachSchema(payload.issues, currLen, inst);
                if (!isAborted)
                  isAborted = aborted(payload, currLen);
              });
            } else {
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                continue;
              attachSchema(payload.issues, currLen, inst);
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            }
          }
          if (asyncResult) {
            return asyncResult.then(() => {
              return payload;
            });
          }
          return payload;
        };
        const handleCanaryResult = (canary, payload, ctx) => {
          if (aborted(canary)) {
            canary.aborted = true;
            return canary;
          }
          const checkResult = runChecks(payload, checks, ctx);
          if (checkResult instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
          }
          return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
          if (ctx.skipChecks) {
            return inst._zod.parse(payload, ctx);
          }
          if (ctx.direction === "backward") {
            const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
            if (canary instanceof Promise) {
              return canary.then((canary2) => {
                return handleCanaryResult(canary2, payload, ctx);
              });
            }
            return handleCanaryResult(canary, payload, ctx);
          }
          const result = inst._zod.parse(payload, ctx);
          if (result instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return result.then((result2) => runChecks(result2, checks, ctx));
          }
          return runChecks(result, checks, ctx);
        };
      }
    }, {
      // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
      get "~standard"() {
        return hide(this, "~standard", standardProps(this));
      },
      set "~standard"(value) {
        own(this, "~standard", value);
      }
    });
    var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
    async function validateAsync(inst, value) {
      const ctx = { async: true };
      return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
    }
    function standardProps(inst) {
      return {
        validate: (value) => {
          const ctx = { async: false };
          try {
            const r = inst._zod.run({ value, issues: [] }, ctx);
            if (!(r instanceof Promise))
              return toStandardResult(r, ctx);
          } catch (_) {
          }
          return validateAsync(inst, value);
        },
        vendor: "zod",
        version: 1
      };
    }
    var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = def.pattern ?? anyString;
      inst._zod.parse = (payload, _) => {
        if (def.coerce)
          try {
            payload.value = String(payload.value);
          } catch (_2) {
          }
        if (typeof payload.value === "string")
          return payload;
        payload.issues.push({
          expected: "string",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = number;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Number(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
          return payload;
        }
        const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
        payload.issues.push({
          expected: "number",
          code: "invalid_type",
          input,
          inst,
          ...received ? { received } : {}
        });
        return payload;
      };
    });
    var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = boolean;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Boolean(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "boolean")
          return payload;
        payload.issues.push({
          expected: "boolean",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    function handleArrayResult(result, final, index) {
      if (result.issues.length) {
        final.issues.push(...prefixIssues(index, result.issues));
      }
      final.value[index] = result.value;
    }
    var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
      $ZodType.init(inst, def);
      const memo = globalConfig.memoizer;
      memo?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
          payload.issues.push({
            expected: "array",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
        const proms = [];
        const abortEarly = ctx?.abortEarly;
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          const result = def.element._zod.run({
            value: item,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
          } else {
            handleArrayResult(result, payload, i);
            if (abortEarly && result.issues.length !== 0 && aborted(result))
              break;
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    function handlePropertyResult(result, final, key, input, optin, optout) {
      const isPresent = key in input;
      const isOptionalOut = optout === "optional";
      if (!isPresent && isOptionalOut && optin === "optional") {
        return;
      }
      if (result.issues.length) {
        if (optin !== void 0 && isOptionalOut && !isPresent) {
          return;
        }
        final.issues.push(...prefixIssues(key, result.issues));
      }
      if (!isPresent && optin === void 0) {
        if (!result.issues.length) {
          final.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: void 0,
            path: [key]
          });
        }
        return;
      }
      if (result.value === void 0) {
        if (isPresent || optin === "defaulted" && !isOptionalOut) {
          final.value[key] = void 0;
        }
      } else {
        final.value[key] = result.value;
      }
    }
    var NO_SYMBOL_KEYS = [];
    function normalizeDef(def) {
      const keys = Object.keys(def.shape);
      const ownSymbols = Object.getOwnPropertySymbols(def.shape);
      const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
      const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
      for (const k of allKeys) {
        if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
          throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
        }
      }
      const okeys = optionalKeys(def.shape);
      return {
        ...def,
        allKeys,
        symbolKeys,
        // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
        keySet: new Set(keys),
        numKeys: keys.length,
        optionalKeys: new Set(okeys)
      };
    }
    function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
      const unrecognized = [];
      const keySet = def.keySet;
      const _catchall = def.catchall._zod;
      const t = _catchall.def.type;
      const optin = _catchall.optin;
      const optout = _catchall.optout;
      let seen = 0;
      for (const key in input) {
        if (abortEarly && payload.issues.length !== seen) {
          if (aborted(payload, seen))
            break;
          seen = payload.issues.length;
        }
        if (keySet.has(key))
          continue;
        if (key === "__proto__") {
          if (t === "never")
            unrecognized.push(key);
          continue;
        }
        if (t === "never") {
          unrecognized.push(key);
          continue;
        }
        const r = _catchall.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
        } else {
          handlePropertyResult(r, payload, key, input, optin, optout);
        }
      }
      if (unrecognized.length) {
        payload.issues.push({
          code: "unrecognized_keys",
          keys: unrecognized,
          input,
          inst,
          // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
          continue: true
        });
      }
      if (!proms.length)
        return payload;
      return Promise.all(proms).then(() => {
        return payload;
      });
    }
    var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
      $ZodType.init(inst, def);
      const desc = Object.getOwnPropertyDescriptor(def, "shape");
      const sh = desc?.get ? desc.get.raw : def.shape ?? {};
      if (sh) {
        const get = () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", { value: newSh });
          get.raw = newSh;
          return newSh;
        };
        get.raw = sh;
        Object.defineProperty(def, "shape", { get });
      }
      const _normalized = cached(() => normalizeDef(def));
      defineLazyInternal(inst, "propValues", (zod) => {
        const shape = zod.def.shape;
        const propValues = {};
        for (const key in shape) {
          const field = shape[key]._zod;
          if (field.values) {
            if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
              assignProp(propValues, key, /* @__PURE__ */ new Set());
            }
            for (const v of field.values)
              propValues[key].add(v);
            if (field.optin !== void 0)
              propValues[key].add(void 0);
          }
        }
        return propValues;
      });
      const isObject2 = isObject;
      const catchall = def.catchall;
      let value;
      const memo = globalConfig.memoizer;
      memo?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject2(input)) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        const proms = [];
        const shape = value.shape;
        const abortEarly = ctx?.abortEarly;
        let seen = payload.issues.length;
        for (const key of value.allKeys) {
          if (abortEarly && payload.issues.length !== seen) {
            if (aborted(payload, seen))
              break;
            seen = payload.issues.length;
          }
          if (key === "__proto__")
            continue;
          const el = shape[key];
          const optin = el._zod.optin;
          const optout = el._zod.optout;
          const r = el._zod.run({ value: input[key], issues: [] }, ctx);
          if (r instanceof Promise) {
            proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
          } else {
            handlePropertyResult(r, payload, key, input, optin, optout);
          }
        }
        if (!catchall) {
          return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
      };
    });
    function handleUnionResults(results, final, inst, ctx) {
      for (const result of results) {
        if (result.issues.length === 0) {
          final.value = result.value;
          return final;
        }
      }
      const nonaborted = results.filter((r) => !aborted(r));
      if (nonaborted.length === 1) {
        final.value = nonaborted[0].value;
        return nonaborted[0];
      }
      final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
      });
      return final;
    }
    var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
      defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
      defineLazyInternal(inst, "values", (zod) => {
        if (zod.def.options.every((o) => o._zod.values)) {
          return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return void 0;
      });
      defineLazyInternal(inst, "pattern", (zod) => {
        if (zod.def.options.every((o) => o._zod.pattern)) {
          const patterns = zod.def.options.map((o) => o._zod.pattern);
          return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
        }
        return void 0;
      });
      const first = def.options.length === 1 ? def.options[0]._zod.run : null;
      inst._zod.parse = (payload, ctx) => {
        if (first) {
          return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
          const result = option._zod.run({
            value: payload.value,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            results.push(result);
            async = true;
          } else {
            if (result.issues.length === 0)
              return result;
            results.push(result);
          }
        }
        if (!async)
          return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results2) => {
          return handleUnionResults(results2, payload, inst, ctx);
        });
      };
    });
    function discriminatorMap(def) {
      const map = /* @__PURE__ */ new Map();
      for (const option of def.options) {
        const values2 = option._zod.propValues?.[def.discriminator];
        if (!values2 || values2.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const value of values2) {
          if (map.has(value)) {
            if (value !== void 0)
              throw new Error(`Duplicate discriminator value "${String(value)}"`);
            map.set(value, null);
          } else {
            map.set(value, option);
          }
        }
      }
      return map;
    }
    var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
      def.inclusive = false;
      $ZodUnion.init(inst, def);
      const _super = inst._zod.parse;
      defineLazyInternal(inst, "propValues", (zod) => {
        const propValues = {};
        let undefinedCount = 0;
        for (const option of zod.def.options) {
          const pv = option._zod.propValues;
          if (!pv || Object.keys(pv).length === 0)
            throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
          if (pv[zod.def.discriminator]?.has(void 0))
            undefinedCount++;
          for (const [k, v] of Object.entries(pv)) {
            if (!Object.prototype.hasOwnProperty.call(propValues, k)) {
              assignProp(propValues, k, /* @__PURE__ */ new Set());
            }
            for (const val of v) {
              propValues[k].add(val);
            }
          }
        }
        if (!zod.def.unionFallback && undefinedCount > 1)
          propValues[zod.def.discriminator]?.delete(void 0);
        return propValues;
      });
      def.options.forEach((option, i) => {
        const propShape = rawShape(option._zod.def);
        if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) {
          throw new Error(`Invalid discriminated union option at index "${i}"`);
        }
      });
      const disc = cached(() => discriminatorMap(def));
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isObject(input)) {
          payload.issues.push({
            code: "invalid_type",
            expected: "object",
            input,
            inst
          });
          return payload;
        }
        const value = input?.[def.discriminator];
        const opt = disc.value.get(value);
        if (opt && (value !== void 0 || ctx.direction !== "backward")) {
          return opt._zod.run(payload, ctx);
        }
        if (def.unionFallback || ctx.direction === "backward") {
          return _super(payload, ctx);
        }
        payload.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          discriminator: def.discriminator,
          options: Array.from(disc.value.keys()).filter((value2) => disc.value.get(value2) !== null),
          input,
          path: [def.discriminator],
          inst
        });
        return payload;
      };
    });
    var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
      $ZodType.init(inst, def);
      const memo = globalConfig.memoizer;
      memo?.attach(inst);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isPlainObject(input)) {
          payload.issues.push({
            expected: "record",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        const proms = [];
        const values2 = def.keyType._zod.values;
        if (values2 && !def.partial) {
          payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
          const recordKeys = /* @__PURE__ */ new Set();
          for (const key of values2) {
            if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
              recordKeys.add(typeof key === "number" ? key.toString() : key);
              if (key === "__proto__")
                continue;
              const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
              if (keyResult instanceof Promise) {
                throw new Error("Async schemas not supported in object keys currently");
              }
              if (keyResult.issues.length) {
                payload.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                  input: key,
                  path: [key],
                  inst
                });
                continue;
              }
              const outKey = keyResult.value;
              if (outKey === "__proto__")
                continue;
              const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
              if (result instanceof Promise) {
                proms.push(result.then((result2) => {
                  if (result2.issues.length) {
                    payload.issues.push(...prefixIssues(key, result2.issues));
                  }
                  payload.value[outKey] = result2.value;
                }));
              } else {
                if (result.issues.length) {
                  payload.issues.push(...prefixIssues(key, result.issues));
                }
                payload.value[outKey] = result.value;
              }
            }
          }
          let unrecognized;
          for (const key in input) {
            if (!recordKeys.has(key)) {
              if (def.mode === "loose") {
                if (key === "__proto__")
                  continue;
                payload.value[key] = input[key];
              } else {
                unrecognized = unrecognized ?? [];
                unrecognized.push(key);
              }
            }
          }
          if (unrecognized && unrecognized.length > 0) {
            payload.issues.push({
              code: "unrecognized_keys",
              input,
              inst,
              keys: unrecognized,
              continue: true
            });
          }
        } else {
          payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
          let unrecognized;
          for (const key of Reflect.ownKeys(input)) {
            if (key === "__proto__")
              continue;
            if (!Object.prototype.propertyIsEnumerable.call(input, key))
              continue;
            let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            const checkNumericKey = typeof key === "string" && number.test(key) && keyResult.issues.length;
            if (checkNumericKey) {
              const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
              if (retryResult instanceof Promise) {
                throw new Error("Async schemas not supported in object keys currently");
              }
              if (retryResult.issues.length === 0) {
                keyResult = retryResult;
              }
            }
            if (keyResult.issues.length) {
              if (def.mode === "loose") {
                payload.value[key] = input[key];
              } else if (values2) {
                unrecognized = unrecognized ?? [];
                unrecognized.push(key);
              } else {
                payload.issues.push({
                  code: "invalid_key",
                  origin: "record",
                  issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                  input: key,
                  path: [key],
                  inst
                });
              }
              continue;
            }
            const outKey = keyResult.value;
            if (outKey === "__proto__")
              continue;
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[outKey] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[outKey] = result.value;
            }
          }
          if (unrecognized && unrecognized.length > 0) {
            payload.issues.push({
              code: "unrecognized_keys",
              input,
              inst,
              keys: unrecognized,
              continue: true
            });
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
      $ZodType.init(inst, def);
      const values2 = new Set(def.values);
      inst._zod.values = values2;
      defineLazyInternal(inst, "pattern", (zod) => {
        const vals = zod.def.values;
        return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
      });
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (values2.has(input)) {
          return payload;
        }
        payload.issues.push({
          code: "invalid_value",
          values: def.values,
          input,
          inst
        });
        return payload;
      };
    });
    function handleOptionalResult(payload, result) {
      payload.value = result.issues.length ? void 0 : result.value;
      return payload;
    }
    var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
      inst._zod.optout = "optional";
      defineLazyInternal(inst, "values", (zod) => {
        const values2 = zod.def.innerType._zod.values;
        return values2 ? /* @__PURE__ */ new Set([...values2, void 0]) : void 0;
      });
      defineLazyInternal(inst, "pattern", (zod) => {
        const pattern = zod.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        if (payload.value === void 0) {
          if (def.innerType._zod.optin !== "defaulted")
            return payload;
          const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
          if (result instanceof Promise)
            return result.then((result2) => handleOptionalResult(payload, result2));
          return handleOptionalResult(payload, result);
        }
        return def.innerType._zod.run(payload, ctx);
      };
    });

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/core/api.js
    function snapshotChecks(def) {
      if (def.checks)
        def.checks = [...def.checks];
      return def;
    }
    // @__NO_SIDE_EFFECTS__
    function _string(Class, params) {
      return new Class(snapshotChecks({ type: "string", ...normalizeParams(params) }));
    }
    // @__NO_SIDE_EFFECTS__
    function _number(Class, params) {
      return new Class(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
    }
    // @__NO_SIDE_EFFECTS__
    function _boolean(Class, params) {
      return new Class({
        type: "boolean",
        ...normalizeParams(params)
      });
    }

    // node_modules/.pnpm/zod@4.6.5/node_modules/zod/v4/mini/schemas.js
    var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
      if (!inst._zod)
        throw new Error("Uninitialized schema in ZodMiniType.");
      $ZodType.init(inst, def);
      inst.def = def;
      inst.type = def.type;
    }, {
      // `with` is an alias for `check`: the same function object, not a wrapper.
      get with() {
        return this.check;
      },
      set with(value) {
        own(this, "with", value);
      },
      parse(data, params) {
        return parse(this, data, params, { callee: this.parse });
      },
      parseAsync(data, params) {
        return parseAsync(this, data, params, { callee: this.parseAsync });
      },
      safeParse(data, params) {
        return safeParse(this, data, params);
      },
      safeParseAsync(data, params) {
        return safeParseAsync(this, data, params);
      },
      check(...checks) {
        const def = this.def;
        return this.clone({
          ...def,
          checks: [
            ...def.checks ?? [],
            ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }, { parent: true });
      },
      clone(_def, params) {
        return clone(this, _def, params);
      },
      brand() {
        return this;
      },
      register(reg, meta2) {
        reg.add(this, meta2);
        return this;
      },
      apply(fn, ...args) {
        return args.length === 0 ? fn(this) : fn(this, ...args);
      }
    });
    var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
      $ZodString.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function string2(params) {
      return _string(ZodMiniString, params);
    }
    var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
      $ZodNumber.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function number2(params) {
      return _number(ZodMiniNumber, params);
    }
    var ZodMiniBoolean = /* @__PURE__ */ $constructor("ZodMiniBoolean", (inst, def) => {
      $ZodBoolean.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function boolean2(params) {
      return _boolean(ZodMiniBoolean, params);
    }
    var ZodMiniArray = /* @__PURE__ */ $constructor("ZodMiniArray", (inst, def) => {
      $ZodArray.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function array(element, params) {
      return new ZodMiniArray({
        type: "array",
        element,
        ...normalizeParams(params)
      });
    }
    var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
      $ZodObject.init(inst, def);
      ZodMiniType.init(inst, def);
      installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
    });
    // @__NO_SIDE_EFFECTS__
    function object(shape, params) {
      const def = {
        type: "object",
        shape: shape ?? {},
        ...normalizeParams(params)
      };
      return new ZodMiniObject(def);
    }
    var ZodMiniDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodMiniDiscriminatedUnion", (inst, def) => {
      $ZodDiscriminatedUnion.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function discriminatedUnion(discriminator, options, params) {
      return new ZodMiniDiscriminatedUnion({
        type: "union",
        options,
        discriminator,
        ...normalizeParams(params)
      });
    }
    var ZodMiniRecord = /* @__PURE__ */ $constructor("ZodMiniRecord", (inst, def) => {
      $ZodRecord.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function record(keyType, valueType, params) {
      if (!valueType || !valueType._zod) {
        return new ZodMiniRecord({
          type: "record",
          keyType: /* @__PURE__ */ string2(),
          valueType: keyType,
          ...normalizeParams(valueType)
        });
      }
      return new ZodMiniRecord({
        type: "record",
        keyType,
        valueType,
        ...normalizeParams(params)
      });
    }
    var ZodMiniLiteral = /* @__PURE__ */ $constructor("ZodMiniLiteral", (inst, def) => {
      $ZodLiteral.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function literal(value, params) {
      return new ZodMiniLiteral({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...normalizeParams(params)
      });
    }
    var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
      $ZodOptional.init(inst, def);
      ZodMiniType.init(inst, def);
    });
    // @__NO_SIDE_EFFECTS__
    function optional(innerType) {
      return new ZodMiniOptional({
        type: "optional",
        innerType
      });
    }

    // src/settings-wire.ts
    var id = string2();
    var reference = object({ provider: id, model: id });
    var inputKind = object({
      id,
      title: id,
      translations: optional(record(id, id))
    });
    var model = object({ id, aliases: optional(array(id)), inputs: array(id) });
    var provider = object({
      id,
      models: discriminatedUnion("kind", [
        object({ kind: literal("fixed"), models: array(model) }),
        object({ kind: literal("deployment"), inputs: array(id) })
      ])
    });
    var catalog = object({
      providerComponents: optional(array(object({
        rowId: id,
        moduleName: id,
        providerId: id,
        keyRef: id
      }))),
      operations: array(object({
        id,
        version: number2(),
        title: id,
        description: optional(id),
        translations: optional(record(id, object({ title: id, description: optional(id) }))),
        inputKinds: array(inputKind),
        tool: optional(object({ name: id, description: id })),
        route: object({
          enabled: boolean2(),
          defaultModel: optional(reference),
          fallbackModels: array(reference),
          agentEnabled: boolean2(),
          version: number2(),
          compatible: boolean2()
        }),
        agentAvailable: boolean2(),
        providers: array(provider)
      }))
    });
    var SETTINGS_SERVICE = "system1Settings";
    var PACKAGE = "dsh-system1";
    var descriptor = {
      id: `${PACKAGE}#${SETTINGS_SERVICE}/watch`,
      service: SETTINGS_SERVICE,
      namespace: SETTINGS_SERVICE,
      method: "watch",
      mode: "stream",
      invocation: { kind: "direct" },
      parameters: [],
      cancellation: { parameter: "signal" },
      result: {
        mode: "strict",
        typeSymbol: `${PACKAGE}#${SETTINGS_SERVICE}/watch:result`,
        create: () => catalog
      }
    };
    var settingsRemote = { package: PACKAGE, descriptors: [descriptor] };
    var settingsHost = {
      package: PACKAGE,
      face: "host",
      schemas: [],
      model: { services: [], events: [], objects: [] },
      invocations: settingsRemote.descriptors
    };
    function projectCatalog(value) {
      return JSON.parse(JSON.stringify(catalog.parse(value)));
    }

    // src/contracts/operation.ts
    function resolveOperationEnabled(id2, stored) {
      return stored?.enabled ?? (id2 === "decide" || !!stored?.defaultModel || !!stored?.fallbackModels?.length || stored?.agentEnabled === true);
    }

    // src/client/operation-routes.ts
    function values(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    function routeScope(scope, id2, version2) {
      const decide = id2 === "decide";
      const prefix = ["operations", id2];
      const read = (root) => {
        const operations = values(values(root).operations);
        return Object.hasOwn(operations, id2) ? values(operations[id2]) : {};
      };
      const address = (root) => {
        const route = read(root);
        if (!decide) return route;
        const settings = values(root);
        return {
          ...Object.hasOwn(settings, "defaultModel") ? { defaultModel: settings.defaultModel } : {},
          ...Object.hasOwn(settings, "fallbackModels") ? { fallbackModels: settings.fallbackModels } : {},
          ...Object.hasOwn(route, "enabled") ? { enabled: route.enabled } : {}
        };
      };
      const enabled = (root) => resolveOperationEnabled(id2, read(root));
      return {
        getSnapshot() {
          const snapshot = scope.getSnapshot();
          return {
            ...snapshot,
            value: snapshot.value === void 0 ? void 0 : { ...address(snapshot.value), enabled: enabled(snapshot.value) },
            base: address(snapshot.base),
            user: address(snapshot.user)
          };
        },
        subscribe: (listener) => scope.subscribe(listener),
        mutate(edits, revision) {
          if (!edits.length) return Promise.resolve(true);
          const patches = edits.map((edit) => decide && edit.path[0] !== "enabled" ? edit : { ...edit, path: [...prefix, ...edit.path] });
          if (!decide && edits.some(({ path }) => path[0] === "defaultModel" || path[0] === "fallbackModels"))
            patches.push({ op: "set", path: [...prefix, "version"], value: version2 });
          const original = scope.getSnapshot().value;
          if (!enabled(original) && read(original).enabled === void 0 && !edits.some(({ path }) => path[0] === "enabled") && edits.some((edit) => edit.op === "set" && (edit.path[0] === "defaultModel" || edit.path[0] === "fallbackModels" && Array.isArray(edit.value) && edit.value.length > 0 || edit.path[0] === "agentEnabled" && edit.value === true))) {
            patches.push({ op: "set", path: [...prefix, "enabled"], value: false });
          }
          return scope.mutate(patches, revision);
        }
      };
    }
    function describeCandidate(entry, ref) {
      const provider2 = ref.provider.trim();
      const model2 = ref.model.trim();
      if (!provider2 || !model2) return void 0;
      const implementation = entry.providers.find((candidate) => candidate.id === provider2);
      if (!implementation) return void 0;
      const catalog2 = implementation.models;
      if (catalog2.kind === "deployment") return { provider: provider2, model: model2, inputs: catalog2.inputs };
      const match = catalog2.models.find((candidate) => candidate.id === model2 || candidate.aliases?.includes(model2));
      return match && { provider: provider2, model: match.id, inputs: match.inputs };
    }
    function previewRoute(entry, route) {
      const seen = /* @__PURE__ */ new Set();
      const candidates = route.flatMap((ref) => {
        const candidate = describeCandidate(entry, ref);
        if (!candidate) return [];
        const key = JSON.stringify([candidate.provider, candidate.model]);
        if (seen.has(key)) return [];
        seen.add(key);
        return [candidate];
      });
      return entry.inputKinds.map((input) => ({
        input,
        candidates: candidates.filter((candidate) => candidate.inputs.includes(input.id))
      }));
    }

    // src/client/provider-instance.ts
    function providerComponent(components, rowId, moduleName) {
      const matches = components?.filter((item) => item.rowId === rowId && item.moduleName === moduleName);
      const binding = matches?.length === 1 ? matches[0] : void 0;
      return binding && components?.filter((item) => item.providerId === binding.providerId).length === 1 ? binding : void 0;
    }
    function providerModels(entries, instanceId) {
      const models = /* @__PURE__ */ new Map();
      for (const entry of entries) {
        const manifest = entry.providers.find(({ id: id2 }) => id2 === instanceId)?.models;
        if (!manifest) continue;
        const saved = /* @__PURE__ */ new Map();
        const chain = [entry.route.defaultModel, ...entry.route.fallbackModels];
        for (const [index, ref] of chain.entries()) {
          if (ref?.provider !== instanceId) continue;
          const match = describeCandidate(entry, ref);
          if (!match) continue;
          const position = index === 0 ? { kind: "primary" } : { kind: "fallback", index };
          saved.set(match.model, [...saved.get(match.model) ?? [], position]);
        }
        const registered = manifest.kind === "fixed" ? manifest.models : [
          { id: "", inputs: manifest.inputs },
          ...[...saved.keys()].map((id2) => ({ id: id2, inputs: manifest.inputs }))
        ];
        for (const model2 of registered) {
          const usage = { entry, inputs: model2.inputs, positions: saved.get(model2.id) ?? [] };
          models.set(model2.id, [...models.get(model2.id) ?? [], usage]);
        }
      }
      return models;
    }

    // src/client/index.ts
    var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

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
    function addFallbackModel(rows, model2) {
      return [...rows.map(copyFallbackModel), copyFallbackModel(model2)];
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

    // src/client/release-notes-overlay.ts
    var import_react = require("react");
    var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

    // src/client/release-notes-diagnostics.ts
    function createReleaseNoticeReporter(log) {
      const loggedAutomaticReasons = /* @__PURE__ */ new Set();
      return (result, automatic) => {
        if (result.status === "shown") {
          if (!result.persisted) {
            report(
              "marker-save-failed",
              "The notice was shown, but its display marker could not be saved.",
              automatic
            );
          }
          return;
        }
        if (result.reason === "already-shown" || result.reason === "slot-lost" || result.reason === "cancelled")
          return;
        if (result.reason === "storage-unavailable") {
          report(
            "storage-unavailable",
            "Automatic update notice skipped because browser storage is unavailable.",
            automatic
          );
        } else if (result.reason === "lock-unavailable") {
          report(
            "lock-unavailable",
            "Automatic update notice skipped because no cross-tab locking API is available.",
            automatic
          );
        } else {
          report("failed", `Release notice could not be shown: ${String(result.error)}`, automatic);
        }
      };
      function report(reason, message, automatic) {
        if (automatic && loggedAutomaticReasons.has(reason)) return;
        if (automatic) loggedAutomaticReasons.add(reason);
        log(message);
      }
    }

    // src/client/release-notes-groups.ts
    var RELEASE_NOTICE_KIND_ORDER = [
      "migration",
      "added",
      "improved",
      "fixed"
    ];
    function groupReleaseNoticeHighlights(highlights) {
      return RELEASE_NOTICE_KIND_ORDER.flatMap((kind) => {
        const items = highlights.filter((highlight) => highlight.kind === kind);
        return items.length === 0 ? [] : [{ kind, highlights: items }];
      });
    }

    // src/client/release-notes.ts
    var RELEASE_NOTICE = JSON.parse(
      `{"id":"0.7.0","version":"0.7.0","highlights":{"zh":[{"kind":"migration","title":"\u7B2C\u4E09\u65B9\u670D\u52A1\u5546\u63D2\u4EF6\u9700\u540C\u6B65\u5347\u7EA7","description":"\u65E7\u670D\u52A1\u5546\u6CE8\u518C\u63A5\u53E3\u5DF2\u66FF\u6362\u3002\u4F7F\u7528\u7B2C\u4E09\u65B9\u670D\u52A1\u5546\u65F6\uFF0C\u5148\u786E\u8BA4\u6709\u517C\u5BB9\u7248\u672C\u518D\u5347\u7EA7\u3002\u5DF2\u4FDD\u5B58\u7684\u51B3\u7B56\u8DEF\u7531\u548C\u51ED\u636E\u65E0\u9700\u8FC1\u79FB\u3002"},{"kind":"added","title":"\u5B9A\u4F4D\u6587\u672C\u7247\u6BB5\u548C\u56FE\u7247\u533A\u57DF","description":"\u7528 Nace Drex \u6216 Liquid AI \u5728\u539F\u6587\u4E2D\u627E\u7247\u6BB5\uFF0C\u6216\u5728\u5355\u5F20\u56FE\u7247\u4E2D\u6807\u51FA\u5339\u914D\u533A\u57DF\u3002\u542F\u7528\u540E\u53EF\u7531\u63D2\u4EF6\u8C03\u7528\uFF0C\u4E5F\u53EF\u5355\u72EC\u5411 Agent \u5F00\u653E\u5B9A\u4F4D\u5DE5\u5177\u3002"},{"kind":"improved","title":"\u4E3A\u6BCF\u9879\u64CD\u4F5C\u5355\u72EC\u8BBE\u7F6E\u6A21\u578B\u8DEF\u7531","description":"\u51B3\u7B56\u548C\u5B9A\u4F4D\u53EF\u72EC\u7ACB\u542F\u505C\uFF0C\u5206\u522B\u9009\u62E9\u4E3B\u6A21\u578B\u548C\u5907\u7528\u987A\u5E8F\u3002\u5173\u95ED\u4F1A\u4FDD\u7559\u914D\u7F6E\uFF1B\u5B9A\u4F4D\u8BBE\u7F6E\u53EF\u6309\u6587\u672C\u548C\u56FE\u7247\u9884\u89C8\u8DEF\u7531\u3002"},{"kind":"improved","title":"\u5728\u670D\u52A1\u5546\u5B50\u63D2\u4EF6\u67E5\u770B\u6A21\u578B\u7528\u9014","description":"\u67E5\u770B\u6BCF\u4E2A\u6A21\u578B\u652F\u6301\u7684\u8F93\u5165\uFF0C\u4EE5\u53CA\u5B83\u662F\u5DF2\u4FDD\u5B58\u8DEF\u7531\u7684\u4E3B\u6A21\u578B\u3001\u7B2C\u51E0\u4E2A\u5907\u7528\uFF0C\u8FD8\u662F\u672A\u88AB\u9009\u7528\u3002"}],"en":[{"kind":"migration","title":"Upgrade third-party provider plugins together","description":"The old provider registration API has been replaced. Check for a compatible version of any third-party provider before upgrading. Saved Decision routes and credentials carry over."},{"kind":"added","title":"Locate passages and image regions","description":"Use Nace Drex or Liquid AI to find matching passages in the original text or mark matching regions in one image. Enable Locate for plugin calls, and optionally expose it as an Agent tool."},{"kind":"improved","title":"Set a separate model route for each operation","description":"Switch Decision and Locate on or off independently, and choose a primary model and ordered fallbacks for each. Switching off keeps the settings. Locate previews routes for text and images separately."},{"kind":"improved","title":"See model usage in the provider component","description":"Check each model's supported inputs and whether it is a primary model, a numbered fallback, or not selected in saved routes."}]}}`
    );
    var manualRequestListeners = /* @__PURE__ */ new Set();
    var activeReleaseNotesOverlayController;
    function acquireReleaseNotesOverlayController() {
      if (activeReleaseNotesOverlayController !== void 0) return void 0;
      const token = /* @__PURE__ */ Symbol("release-notes-overlay");
      activeReleaseNotesOverlayController = token;
      return () => {
        if (activeReleaseNotesOverlayController === token)
          activeReleaseNotesOverlayController = void 0;
      };
    }
    function requestManualReleaseNotes() {
      for (const listener of manualRequestListeners) listener();
    }
    function onManualReleaseNotesRequest(listener) {
      manualRequestListeners.add(listener);
      return () => manualRequestListeners.delete(listener);
    }

    // src/client/release-notes-locks.ts
    var RELEASE_NOTICE_LOCK_NAME = "dsh-system1:release-notes";
    var DATABASE_NAME = "dsh-system1-release-notes-locks";
    var DATABASE_VERSION = 1;
    var LOCK_STORE = "locks";
    var LOCK_LEASE_MS = 3e4;
    var LOCK_RETRY_MS = 50;
    function createIndexedDbReleaseNoticeLocks(factory, databaseName = DATABASE_NAME, now = Date.now) {
      let databasePromise;
      let database;
      let closed = false;
      let inFlightRequests = 0;
      const closeDatabase = () => {
        const opened = database;
        database = void 0;
        opened?.close();
      };
      const getDatabase = () => {
        if (closed) return Promise.reject(new Error("Release notice locks have been closed."));
        if (databasePromise === void 0) {
          databasePromise = openDatabase(factory, databaseName).then((opened) => {
            if (closed) {
              opened.close();
              throw new Error("Release notice locks have been closed.");
            }
            database = opened;
            return opened;
          });
        }
        return databasePromise;
      };
      const request = (name, optionsOrCallback, maybeCallback) => {
        if (closed) return Promise.reject(new Error("Release notice locks have been closed."));
        const callback = typeof optionsOrCallback === "function" ? optionsOrCallback : maybeCallback;
        if (callback === void 0) return Promise.reject(new TypeError("A lock callback is required."));
        const signal = typeof optionsOrCallback === "function" ? void 0 : optionsOrCallback.signal;
        inFlightRequests++;
        return runWithIndexedDbLock(getDatabase, name, signal, now, () => callback(null)).finally(() => {
          inFlightRequests--;
          if (closed && inFlightRequests === 0) closeDatabase();
        });
      };
      const close = () => {
        closed = true;
        if (inFlightRequests === 0) closeDatabase();
      };
      return { request, close };
    }
    function resolveReleaseNoticeLocks(webLocks, factory) {
      if (webLocks !== void 0) return webLocks;
      return factory === void 0 ? void 0 : createIndexedDbReleaseNoticeLocks(factory);
    }
    function openDatabase(factory, name) {
      return new Promise((resolve, reject) => {
        let request;
        try {
          request = factory.open(name, DATABASE_VERSION);
        } catch (error) {
          reject(error);
          return;
        }
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(LOCK_STORE))
            database.createObjectStore(LOCK_STORE);
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error ?? new Error("Could not open release notice lock database."));
      });
    }
    async function runWithIndexedDbLock(getDatabase, name, signal, now, callback) {
      if (signal?.aborted) throw abortReason(signal);
      const database = await waitForPromise(getDatabase(), signal);
      const owner = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      while (true) {
        if (signal?.aborted) throw abortReason(signal);
        if (await tryAcquire(database, name, owner, now)) break;
        await waitForRetry(signal);
      }
      try {
        if (signal?.aborted) throw abortReason(signal);
        return await callback();
      } finally {
        try {
          await release(database, name, owner);
        } catch {
        }
      }
    }
    function waitForPromise(promise, signal) {
      if (signal === void 0) return promise;
      if (signal.aborted) return Promise.reject(abortReason(signal));
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (complete) => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          complete();
        };
        const onAbort = () => finish(() => reject(abortReason(signal)));
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(
          (value) => finish(() => resolve(value)),
          (error) => finish(() => reject(error))
        );
        if (signal.aborted) onAbort();
      });
    }
    function tryAcquire(database, name, owner, now) {
      const transaction = database.transaction(LOCK_STORE, "readwrite");
      const finished = transactionFinished(transaction);
      let acquired = false;
      const request = transaction.objectStore(LOCK_STORE).get(name);
      request.onsuccess = () => {
        if (isLiveLease(request.result, now())) return;
        acquired = true;
        transaction.objectStore(LOCK_STORE).put({
          owner,
          expiresAt: now() + LOCK_LEASE_MS
        }, name);
      };
      return finished.then(() => acquired);
    }
    function isLiveLease(value, now) {
      if (value === null || typeof value !== "object") return false;
      const lease = value;
      return typeof lease.owner === "string" && typeof lease.expiresAt === "number" && lease.expiresAt > now;
    }
    function release(database, name, owner) {
      const transaction = database.transaction(LOCK_STORE, "readwrite");
      const finished = transactionFinished(transaction);
      const store = transaction.objectStore(LOCK_STORE);
      const request = store.get(name);
      request.onsuccess = () => {
        if (request.result?.owner === owner) store.delete(name);
      };
      return finished;
    }
    function transactionFinished(transaction) {
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error("Release notice lock transaction aborted."));
        transaction.onerror = () => reject(transaction.error ?? new Error("Release notice lock transaction failed."));
      });
    }
    function waitForRetry(signal) {
      if (signal?.aborted) return Promise.reject(abortReason(signal));
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(finish, LOCK_RETRY_MS);
        const onAbort = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          reject(abortReason(signal));
        };
        function finish() {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    }
    function abortReason(signal) {
      return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
    }

    // src/client/release-notes-state.ts
    var RELEASE_NOTICE_STORAGE_KEY = "dsh-system1:release-notes:lastShownNoticeId";
    async function presentReleaseNotice({
      noticeId,
      automatic,
      storage,
      locks,
      signal,
      present
    }) {
      const run = async () => {
        if (signal?.aborted) return { status: "skipped", reason: "cancelled" };
        if (automatic) {
          if (storage === void 0) return { status: "skipped", reason: "storage-unavailable" };
          const previous = readLastShown(storage);
          if (!previous.ok) return { status: "skipped", reason: "storage-unavailable" };
          if (previous.noticeId === noticeId) return { status: "skipped", reason: "already-shown" };
          if (!probeStorage(storage)) return { status: "skipped", reason: "storage-unavailable" };
        }
        let mounted;
        try {
          mounted = await present();
        } catch (error) {
          return { status: "skipped", reason: "failed", error };
        }
        if (mounted === "slot-lost") return { status: "skipped", reason: "slot-lost" };
        if (!mounted) {
          if (signal?.aborted) return { status: "skipped", reason: "cancelled" };
          return {
            status: "skipped",
            reason: "failed",
            error: new Error("Release notice dialog did not mount.")
          };
        }
        return {
          status: "shown",
          persisted: storage !== void 0 && writeLastShown(storage, noticeId)
        };
      };
      if (locks === void 0) {
        return automatic ? { status: "skipped", reason: "lock-unavailable" } : run();
      }
      let callbackStarted = false;
      try {
        const callback = () => {
          callbackStarted = true;
          return run();
        };
        return signal === void 0 ? await locks.request(RELEASE_NOTICE_LOCK_NAME, callback) : await locks.request(RELEASE_NOTICE_LOCK_NAME, { signal }, callback);
      } catch (error) {
        if (signal?.aborted) return { status: "skipped", reason: "cancelled" };
        if (!automatic && !callbackStarted) return run();
        return { status: "skipped", reason: "failed", error };
      }
    }
    function readLastShown(storage) {
      try {
        return { ok: true, noticeId: storage.getItem(RELEASE_NOTICE_STORAGE_KEY) };
      } catch {
        return { ok: false };
      }
    }
    function probeStorage(storage) {
      const probeValue = "dsh-system1:release-notes:storage-probe";
      let previous;
      try {
        previous = storage.getItem(RELEASE_NOTICE_STORAGE_KEY);
        storage.setItem(RELEASE_NOTICE_STORAGE_KEY, previous ?? probeValue);
        if (previous === null) storage.removeItem(RELEASE_NOTICE_STORAGE_KEY);
        return true;
      } catch {
        try {
          if (storage.getItem(RELEASE_NOTICE_STORAGE_KEY) === probeValue)
            storage.removeItem(RELEASE_NOTICE_STORAGE_KEY);
        } catch {
        }
        return false;
      }
    }
    function writeLastShown(storage, noticeId) {
      try {
        storage.setItem(RELEASE_NOTICE_STORAGE_KEY, noticeId);
        return true;
      } catch {
        return false;
      }
    }

    // src/client/release-notes-overlay.ts
    var RELEASE_NOTICE_SLOT_SETTLE_MS = 500;
    var RELEASE_NOTICE_MOUNT_TIMEOUT_MS = 1e4;
    function ReleaseNotesOverlay({ t, log }) {
      const [active, setActive] = (0, import_react.useState)(null);
      const activeRef = (0, import_react.useRef)(null);
      (0, import_react.useEffect)(() => {
        const releaseController = acquireReleaseNotesOverlayController();
        if (releaseController === void 0) return;
        const controller = new AbortController();
        const storage = readNoticeStorage();
        const locks = readNoticeLocks();
        let automaticFinished = false;
        let automaticAttempt;
        let stopAutomaticWatching = () => {
        };
        const report = createReleaseNoticeReporter(log);
        const present = (automatic) => presentReleaseNotice({
          noticeId: RELEASE_NOTICE.id,
          automatic,
          ...storage === void 0 ? {} : { storage },
          ...locks === void 0 ? {} : { locks },
          signal: controller.signal,
          present: () => {
            if (controller.signal.aborted) return false;
            if (automatic && (!hasPresentationSlot() || activeRef.current !== null))
              return "slot-lost";
            return mountNotice(RELEASE_NOTICE, activeRef, setActive, controller.signal);
          }
        });
        const onManualRequest = () => {
          void present(false).then((result) => report(result, false));
        };
        const scheduleAutomatic = () => {
          if (automaticFinished || automaticAttempt !== void 0 || controller.signal.aborted) return;
          automaticAttempt = (async () => {
            if (!await waitForPresentationSlot(controller.signal)) return;
            const result = await present(true);
            report(result, true);
            automaticFinished = !(result.status === "skipped" && result.reason === "slot-lost");
            if (automaticFinished) stopAutomaticWatching();
          })().finally(() => {
            automaticAttempt = void 0;
            if (!automaticFinished && !controller.signal.aborted && hasPresentationSlot())
              scheduleAutomatic();
          });
        };
        const observer = new MutationObserver(scheduleAutomatic);
        observePresentationChanges(observer);
        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") scheduleAutomatic();
        };
        stopAutomaticWatching = () => {
          observer.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };
        const disposeManualListener = onManualReleaseNotesRequest(onManualRequest);
        document.addEventListener("visibilitychange", onVisibilityChange);
        scheduleAutomatic();
        return () => {
          controller.abort();
          locks?.close?.();
          stopAutomaticWatching();
          disposeManualListener();
          activeRef.current?.mounted(false);
          activeRef.current = null;
          releaseController();
        };
      }, [log]);
      const close = (0, import_react.useCallback)(() => {
        activeRef.current = null;
        setActive(null);
      }, []);
      return active === null ? null : (0, import_react.createElement)(ReleaseNotesDialog, { active, t, onClose: close });
    }
    function mountNotice(notice, activeRef, setActive, signal) {
      if (signal.aborted) return Promise.resolve(false);
      if (activeRef.current !== null) return Promise.resolve("slot-lost");
      return new Promise((resolve) => {
        let settled = false;
        let timeout = 0;
        const finish = (mounted) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          signal.removeEventListener("abort", onAbort);
          if (mounted !== true) {
            activeRef.current = null;
            setActive(null);
          }
          resolve(mounted);
        };
        const onAbort = () => finish(false);
        timeout = window.setTimeout(() => finish(false), RELEASE_NOTICE_MOUNT_TIMEOUT_MS);
        const next = { notice, mounted: finish };
        activeRef.current = next;
        signal.addEventListener("abort", onAbort, { once: true });
        setActive(next);
      });
    }
    function ReleaseNotesDialog({
      active,
      t,
      onClose
    }) {
      (0, import_react.useLayoutEffect)(() => {
        const dialog = document.querySelector('.dsh-system1-release-notes-modal[role="dialog"][aria-modal="true"]');
        active.mounted(document.visibilityState === "visible" ? dialog !== null : "slot-lost");
      }, [active]);
      const releaseURL = `https://github.com/exoticknight/dsh-system1/releases/tag/v${encodeURIComponent(active.notice.version)}`;
      return (0, import_react.createElement)(import_dsh_client_ui_primitives.Modal, {
        open: true,
        onClose,
        title: t("releaseTitle"),
        description: `v${active.notice.version}`,
        closeLabel: t("releaseClose"),
        className: "dsh-system1-release-notes-modal",
        contentClassName: "dsh-system1-release-notes-content",
        children: (0, import_react.createElement)(
          "div",
          { style: releaseNoticeBodyStyle },
          (0, import_react.createElement)("style", null, releaseNoticeCSS),
          releaseNoticeSections(active.notice, t)
        ),
        footer: (0, import_react.createElement)(
          "div",
          { style: releaseNoticeFooterStyle },
          (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
            variant: "ghost",
            size: "sm",
            onClick: () => window.open(releaseURL, "_blank", "noopener,noreferrer")
          }, t("releaseLink")),
          (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
            variant: "primary",
            size: "sm",
            ...{ "data-modal-autofocus": true },
            onClick: onClose
          }, t("releaseAcknowledge"))
        )
      });
    }
    function releaseNoticeSections(notice, t) {
      const highlights = notice.highlights[noticeLanguage(t)];
      const labels = {
        migration: "releaseMigration",
        added: "releaseAdded",
        improved: "releaseImproved",
        fixed: "releaseFixed"
      };
      return groupReleaseNoticeHighlights(highlights).map(({ kind, highlights: items }) => (0, import_react.createElement)(
        "section",
        { key: kind, style: releaseNoticeSectionStyle },
        (0, import_react.createElement)("h3", { style: releaseNoticeHeadingStyle }, t(labels[kind])),
        (0, import_react.createElement)("ul", { style: releaseNoticeListStyle }, items.map((item, index) => (0, import_react.createElement)(
          "li",
          { key: `${kind}-${index}`, style: releaseNoticeItemStyle },
          (0, import_react.createElement)("div", { style: releaseNoticeItemTitleStyle }, item.title),
          item.description === void 0 ? null : (0, import_react.createElement)("p", { style: releaseNoticeDescriptionStyle }, item.description)
        )))
      ));
    }
    function noticeLanguage(t) {
      return t("releaseLanguage") === "zh" ? "zh" : "en";
    }
    function readNoticeStorage() {
      try {
        return window.localStorage;
      } catch {
        return void 0;
      }
    }
    function readNoticeLocks() {
      try {
        if (typeof navigator === "undefined") return void 0;
        const factory = typeof window === "undefined" ? void 0 : window.indexedDB;
        return resolveReleaseNoticeLocks(navigator.locks ?? void 0, factory);
      } catch {
        return void 0;
      }
    }
    function hasPresentationSlot() {
      return document.visibilityState === "visible" && document.querySelector(import_dsh_client_ui_primitives.modalSelector) === null;
    }
    function waitForPresentationSlot(signal) {
      if (signal.aborted) return Promise.resolve(false);
      return new Promise((resolve) => {
        let observer;
        let settleTimer;
        const finish = (value) => {
          if (settleTimer !== void 0) window.clearTimeout(settleTimer);
          observer.disconnect();
          document.removeEventListener("visibilitychange", check);
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        };
        const check = () => {
          if (signal.aborted) finish(false);
          else if (!hasPresentationSlot()) {
            if (settleTimer !== void 0) {
              window.clearTimeout(settleTimer);
              settleTimer = void 0;
            }
          } else if (settleTimer === void 0) {
            settleTimer = window.setTimeout(() => {
              settleTimer = void 0;
              finish(hasPresentationSlot());
            }, RELEASE_NOTICE_SLOT_SETTLE_MS);
          }
        };
        const onAbort = () => finish(false);
        observer = new MutationObserver(check);
        observePresentationChanges(observer);
        document.addEventListener("visibilitychange", check);
        signal.addEventListener("abort", onAbort, { once: true });
        check();
      });
    }
    function observePresentationChanges(observer) {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["role", "aria-modal"]
      });
    }
    var releaseNoticeBodyStyle = {
      maxHeight: "min(420px, calc(100dvh - 260px))",
      overflowY: "auto",
      overscrollBehavior: "contain"
    };
    var releaseNoticeFooterStyle = {
      display: "flex",
      justifyContent: "space-between",
      width: "100%"
    };
    var releaseNoticeSectionStyle = { display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 };
    var releaseNoticeHeadingStyle = {
      margin: 0,
      color: "var(--dsw-alias-label-secondary)",
      fontSize: 12,
      lineHeight: "18px",
      fontWeight: 600
    };
    var releaseNoticeListStyle = { margin: 0, paddingLeft: 20, color: "var(--dsw-alias-label-primary)" };
    var releaseNoticeItemStyle = { paddingLeft: 2, marginBottom: 12 };
    var releaseNoticeItemTitleStyle = { fontSize: 14, lineHeight: "21px", fontWeight: 500 };
    var releaseNoticeDescriptionStyle = {
      margin: "4px 0 0",
      color: "var(--dsw-alias-label-secondary)",
      fontSize: 13,
      lineHeight: "20px"
    };
    var releaseNoticeCSS = `
    .dsh-system1-release-notes-modal {
      width: min(520px, 100%);
      max-height: calc(100dvh - 96px);
    }
    .dsh-system1-release-notes-content {
      min-height: 0;
    }
    @media (max-width: 480px) {
      .dsh-system1-release-notes-modal {
        width: 100%;
        max-height: calc(100dvh - 48px);
      }
    }
    `;

    // src/client/index.ts
    var NS = "dsh-system1";
    var PACKAGE2 = "dsh-system1";
    var en = {
      coreSummary: "Choose a default model and ordered fallbacks, then configure each provider below.",
      provider: "Provider",
      providerTypesafe: "TypeSafe (Jev)",
      providerLaya: "Laya",
      providerMeraGpt: "meraGPT",
      providerLiquid: "Liquid AI",
      providerNace: "Nace.AI Drex",
      providerCloudflare: "Cloudflare Clef",
      providerUnknown: "Unavailable provider",
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
      timeout: "Provider timeout (ms)",
      defaultHint: "Used when a decision request does not specify a model.",
      operationDefaultHint: "Used when the caller does not specify a model.",
      operationDirectory: "Operations",
      providerInstanceId: "Instance ID",
      providerModels: "Models and capabilities",
      providerModelsUnavailable: "No models are registered for this instance.",
      providerInstanceUnavailable: "The running provider instance is unavailable.",
      routePreview: "Routing by input",
      emptyRoute: "Not configured",
      directoryUnavailable: "The live provider directory is unavailable. Reconnecting\u2026",
      noProviders: "Enable a provider component below to see its models here.",
      crossProviderWarning: "If a request falls back to another provider, that provider may receive the same input.",
      unavailableModel: "Unavailable",
      chooseDeployment: "Deployment name",
      declaredSupport: "Declared support",
      modelSupports: "Supports: {inputs}",
      modelRoutePrimary: "{operation} \xB7 Primary model",
      modelRouteFallback: "{operation} \xB7 Fallback {index}",
      unusedModel: "Not selected",
      connectionSettings: "Connection settings",
      agentTool: "Agent tool",
      agentToolEnabled: "Available to the agent",
      agentToolDisabled: "Off",
      agentToolUnavailable: "Enabled in settings \xB7 main model unavailable",
      agentToolUnmounted: "Enabled in settings \xB7 tool not registered",
      agentToolNeedsPrimary: "Choose an available main model before turning on the Agent tool.",
      agentToolLegacy: "Manage the decision tool in the component list below.",
      agentToolFeatureOff: "Operation off \xB7 tool preference retained",
      featureEnable: "Enable {operation}",
      featureSwitchHelp: "Takes effect when you save. Turning it off keeps your model and Agent settings.",
      featureOff: "This operation is off. The route stays saved but does not run.",
      routeVersionMismatch: "This saved route belongs to a different feature version. Review the models before saving a route for this version.",
      clearModel: "Clear main model",
      timeoutTypesafeHint: "Applies when a request has no timeout. Leave blank to use TypeSafe\u2019s 800 ms default.",
      timeoutLayaHint: "Applies when a request has no timeout. Leave blank to use Laya\u2019s 800 ms default.",
      timeoutMeraGptHint: "Applies when a request has no timeout. Leave blank to use meraGPT\u2019s 10,000 ms default.",
      timeoutNaceHint: "Applies when a request has no timeout. Leave blank to use Nace\u2019s 60,000 ms default.",
      timeoutCloudflareHint: "Applies when a request has no timeout. Leave blank to use Cloudflare\u2019s 800 ms default.",
      feedbackPrompt: "Need help or a provider/model you would like to use?",
      providerFeedbackPrompt: "Having trouble configuring this provider?",
      reportIssue: "Report a problem",
      requestProvider: "Request a provider",
      requestModel: "Request a model",
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
      liquidSummary: "Configure Liquid AI and its API Key.",
      liquidEndpoint: "Liquid AI API base URL",
      liquidEndpointHint: "Include /decisions in the base URL. The plugin appends /v1/systemone.",
      timeoutLiquidHint: "Leave blank to use Liquid AI\u2019s 10,000 ms default.",
      meragptSummary: "Configure meraGPT and its API Key.",
      naceSummary: "Configure Nace.AI Drex and its API Key.",
      typesafeEndpoint: "TypeSafe API base URL",
      typesafeEndpointHint: "The TypeSafe System One endpoint is appended automatically.",
      layaEndpoint: "Laya server base URL",
      layaEndpointHint: "Use the base URL of a Laya server exposing POST /v1/systemone.",
      meragptEndpoint: "meraGPT API base URL",
      meragptEndpointHint: "Use the meraGPT API root; POST /v1/systemone is appended automatically.",
      naceEndpoint: "Nace API base URL",
      naceEndpointHint: "Enter the Nace API root. The plugin adds /v1/systemone for Decision, /v1/locate for text Locate, or /v1/box for image Locate.",
      naceImageRetentionHint: "For Drex Max decisions above the 4 MiB request limit, the plugin may upload some images as temporary files. DSH attempts deletion after each call; Nace keeps uploads for 24 hours by default, and backup removal can take up to 35 days. Image Locate sends its image inline.",
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
      modelTypedDecisions: "Typed-decisions checkpoint",
      releaseLanguage: "en",
      releaseMigration: "Migration notes",
      releaseTitle: "System1 \xB7 What's New",
      releaseEntry: "Release notes",
      releaseAdded: "New",
      releaseImproved: "Improved",
      releaseFixed: "Fixed",
      releaseClose: "Close",
      releaseLink: "Full release notes",
      releaseAcknowledge: "Got it"
    };
    var zh = {
      coreSummary: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B\u548C\u6309\u987A\u5E8F\u5C1D\u8BD5\u7684\u5907\u7528\u6A21\u578B\uFF0C\u518D\u5230\u4E0B\u65B9\u914D\u7F6E\u5404 provider\u3002",
      provider: "\u670D\u52A1\u5546",
      providerTypesafe: "TypeSafe\uFF08Jev\uFF09",
      providerLaya: "Laya",
      providerMeraGpt: "meraGPT",
      providerLiquid: "Liquid AI",
      providerNace: "Nace.AI Drex",
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
      timeout: "Provider \u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
      defaultHint: "\u51B3\u7B56\u8BF7\u6C42\u672A\u6307\u5B9A\u6A21\u578B\u65F6\u4F7F\u7528\u3002",
      operationDefaultHint: "\u8C03\u7528\u65B9\u672A\u6307\u5B9A\u6A21\u578B\u65F6\u4F7F\u7528\u3002",
      operationDirectory: "\u64CD\u4F5C",
      providerInstanceId: "\u5B9E\u4F8B ID",
      providerModels: "\u6A21\u578B\u4E0E\u80FD\u529B",
      providerModelsUnavailable: "\u5F53\u524D\u5B9E\u4F8B\u672A\u6CE8\u518C\u6A21\u578B\u3002",
      providerInstanceUnavailable: "\u6682\u65E0\u6CD5\u8BFB\u53D6\u6B63\u5728\u8FD0\u884C\u7684\u670D\u52A1\u5546\u5B9E\u4F8B\u3002",
      routePreview: "\u5404\u7C7B\u8F93\u5165\u7684\u8DEF\u7531\u987A\u5E8F",
      emptyRoute: "\u672A\u914D\u7F6E",
      directoryUnavailable: "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u8FD0\u884C\u65F6\u76EE\u5F55\uFF0C\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5\u2026",
      noProviders: "\u542F\u7528\u4E0B\u65B9\u76F8\u5E94\u7684\u670D\u52A1\u7EC4\u4EF6\u540E\uFF0C\u53EF\u5728\u8FD9\u91CC\u67E5\u770B\u6A21\u578B\u3002",
      crossProviderWarning: "\u5207\u6362\u5230\u5176\u4ED6\u670D\u52A1\u5546\u515C\u5E95\u65F6\uFF0C\u8BE5\u670D\u52A1\u5546\u53EF\u80FD\u63A5\u6536\u540C\u4E00\u4EFD\u8F93\u5165\u3002",
      unavailableModel: "\u4E0D\u53EF\u7528",
      chooseDeployment: "\u90E8\u7F72\u540D\u79F0",
      declaredSupport: "\u58F0\u660E\u652F\u6301",
      modelSupports: "\u652F\u6301\uFF1A{inputs}",
      modelRoutePrimary: "{operation} \xB7 \u4E3B\u6A21\u578B",
      modelRouteFallback: "{operation} \xB7 \u5907\u7528 {index}",
      unusedModel: "\u672A\u88AB\u9009\u7528",
      connectionSettings: "\u8FDE\u63A5\u8BBE\u7F6E",
      agentTool: "Agent \u5DE5\u5177",
      agentToolEnabled: "Agent \u53EF\u8C03\u7528",
      agentToolDisabled: "\u5173\u95ED",
      agentToolUnavailable: "\u914D\u7F6E\u5DF2\u5F00\u542F \xB7 \u4E3B\u6A21\u578B\u4E0D\u53EF\u7528",
      agentToolUnmounted: "\u914D\u7F6E\u5DF2\u5F00\u542F \xB7 \u5DE5\u5177\u5C1A\u672A\u6CE8\u518C",
      agentToolNeedsPrimary: "\u8BF7\u9009\u62E9\u53EF\u7528\u7684\u4E3B\u6A21\u578B\uFF0C\u518D\u5F00\u542F Agent \u5DE5\u5177\u3002",
      agentToolLegacy: "\u8BF7\u5728\u4E0B\u65B9\u7EC4\u4EF6\u5217\u8868\u4E2D\u7BA1\u7406\u539F\u6709\u51B3\u7B56\u5DE5\u5177\u3002",
      agentToolFeatureOff: "\u64CD\u4F5C\u5DF2\u5173\u95ED \xB7 \u5DE5\u5177\u504F\u597D\u4FDD\u7559",
      featureEnable: "\u542F\u7528{operation}",
      featureSwitchHelp: "\u4FDD\u5B58\u8BBE\u7F6E\u540E\u751F\u6548\u3002\u5173\u95ED\u4F1A\u4FDD\u7559\u6A21\u578B\u548C Agent \u5DE5\u5177\u8BBE\u7F6E\u3002",
      featureOff: "\u6B64\u64CD\u4F5C\u5DF2\u5173\u95ED\u3002\u5DF2\u4FDD\u5B58\u7684\u8DEF\u7531\u4E0D\u4F1A\u6267\u884C\u3002",
      routeVersionMismatch: "\u5DF2\u4FDD\u5B58\u7684\u8DEF\u7531\u5C5E\u4E8E\u5176\u4ED6\u7248\u672C\u3002\u8BF7\u6838\u5BF9\u6240\u9009\u6A21\u578B\uFF0C\u518D\u4FDD\u5B58\u5F53\u524D\u7248\u672C\u7684\u8DEF\u7531\u3002",
      clearModel: "\u6E05\u9664\u4E3B\u6A21\u578B",
      timeoutTypesafeHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u91C7\u7528 TypeSafe \u9ED8\u8BA4\u503C 800 \u6BEB\u79D2\u3002",
      timeoutLayaHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u91C7\u7528 Laya \u9ED8\u8BA4\u503C 800 \u6BEB\u79D2\u3002",
      timeoutMeraGptHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u91C7\u7528 meraGPT \u9ED8\u8BA4\u503C 10,000 \u6BEB\u79D2\u3002",
      timeoutNaceHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u91C7\u7528 Nace \u9ED8\u8BA4\u503C 60,000 \u6BEB\u79D2\u3002",
      timeoutCloudflareHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u91C7\u7528 Cloudflare \u9ED8\u8BA4\u503C 800 \u6BEB\u79D2\u3002",
      feedbackPrompt: "\u9047\u5230\u95EE\u9898\uFF0C\u6216\u7F3A\u5C11\u60F3\u7528\u7684\u63D0\u4F9B\u5546/\u6A21\u578B\uFF1F",
      providerFeedbackPrompt: "\u914D\u7F6E\u6B64\u63D0\u4F9B\u5546\u65F6\u9047\u5230\u95EE\u9898\uFF1F",
      reportIssue: "\u53CD\u9988\u95EE\u9898",
      requestProvider: "\u8BF7\u6C42\u63A5\u5165\u63D0\u4F9B\u5546",
      requestModel: "\u8BF7\u6C42\u6DFB\u52A0\u6A21\u578B",
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
      liquidSummary: "\u914D\u7F6E Liquid AI \u670D\u52A1\u548C API Key\u3002",
      liquidEndpoint: "Liquid AI API \u6839\u5730\u5740",
      liquidEndpointHint: "\u6839\u5730\u5740\u5305\u542B /decisions\uFF1B\u63D2\u4EF6\u4F1A\u81EA\u52A8\u62FC\u63A5 /v1/systemone\u3002",
      timeoutLiquidHint: "\u7559\u7A7A\u4F7F\u7528 Liquid AI \u7684 10,000 ms \u9ED8\u8BA4\u503C\u3002",
      meragptSummary: "\u914D\u7F6E meraGPT \u670D\u52A1\u548C API Key\u3002",
      naceSummary: "\u914D\u7F6E Nace.AI Drex \u670D\u52A1\u548C API Key\u3002",
      typesafeEndpoint: "TypeSafe API \u6839\u5730\u5740",
      typesafeEndpointHint: "\u63D2\u4EF6\u4F1A\u81EA\u52A8\u5728\u5730\u5740\u540E\u62FC\u63A5 TypeSafe System One \u63A5\u53E3\u8DEF\u5F84\u3002",
      layaEndpoint: "Laya \u670D\u52A1\u6839\u5730\u5740",
      layaEndpointHint: "\u586B\u5199\u63D0\u4F9B POST /v1/systemone \u63A5\u53E3\u7684 Laya \u670D\u52A1\u6839\u5730\u5740\u3002",
      meragptEndpoint: "meraGPT API \u6839\u5730\u5740",
      meragptEndpointHint: "\u586B\u5199 meraGPT API \u6839\u5730\u5740\uFF1B\u63D2\u4EF6\u4F1A\u81EA\u52A8\u62FC\u63A5 POST /v1/systemone\u3002",
      naceEndpoint: "Nace API \u6839\u5730\u5740",
      naceEndpointHint: "\u586B\u5199 Nace API \u6839\u5730\u5740\u3002\u51B3\u7B56\u4F7F\u7528 /v1/systemone\uFF0C\u6587\u672C\u5B9A\u4F4D\u4F7F\u7528 /v1/locate\uFF0C\u56FE\u7247\u5B9A\u4F4D\u4F7F\u7528 /v1/box\u3002",
      naceImageRetentionHint: "Drex Max \u51B3\u7B56\u8BF7\u6C42\u8D85\u8FC7 4 MiB \u65F6\uFF0C\u63D2\u4EF6\u53EF\u80FD\u5C06\u90E8\u5206\u56FE\u7247\u4F5C\u4E3A\u4E34\u65F6\u6587\u4EF6\u4E0A\u4F20\u3002DSH \u4F1A\u5728\u8C03\u7528\u540E\u5C1D\u8BD5\u5220\u9664\uFF1BNace \u9ED8\u8BA4\u4FDD\u7559\u4E0A\u4F20\u6587\u4EF6 24 \u5C0F\u65F6\uFF0C\u5907\u4EFD\u6700\u957F\u53EF\u80FD\u9700\u8981 35 \u5929\u6E05\u9664\u3002\u56FE\u7247\u5B9A\u4F4D\u5728\u8BF7\u6C42\u4E2D\u76F4\u63A5\u4F20\u56FE\u3002",
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
      modelTypedDecisions: "\u7C7B\u578B\u5316\u51B3\u7B56\u6A21\u578B",
      releaseLanguage: "zh",
      releaseMigration: "\u8FC1\u79FB\u8BF4\u660E",
      releaseTitle: "System1 \xB7 \u66F4\u65B0\u5185\u5BB9",
      releaseEntry: "\u66F4\u65B0\u5185\u5BB9",
      releaseAdded: "\u65B0\u589E",
      releaseImproved: "\u6539\u8FDB",
      releaseFixed: "\u4FEE\u590D",
      releaseClose: "\u5173\u95ED",
      releaseLink: "\u5B8C\u6574\u53D1\u5E03\u8BF4\u660E",
      releaseAcknowledge: "\u77E5\u9053\u4E86"
    };
    var LAYA_MODEL_LABELS = {
      auto: "modelAuto",
      english: "modelEnglish",
      multilingual: "modelMultilingual",
      "typed-decisions": "modelTypedDecisions"
    };
    var PROVIDERS = [
      {
        id: "typesafe",
        rowId: "system1-typesafe",
        label: "providerTypesafe",
        summary: "typesafeSummary",
        keyHint: "keyHint",
        endpointLabel: "typesafeEndpoint",
        endpointHint: "typesafeEndpointHint",
        timeoutHint: "timeoutTypesafeHint",
        baseURL: "https://api.typesafe.ai"
      },
      {
        id: "laya",
        rowId: "system1-laya",
        label: "providerLaya",
        summary: "layaSummary",
        keyHint: "layaKeyHint",
        endpointLabel: "layaEndpoint",
        endpointHint: "layaEndpointHint",
        timeoutHint: "timeoutLayaHint",
        baseURL: "http://127.0.0.1:8000"
      },
      {
        id: "nace",
        rowId: "system1-nace",
        label: "providerNace",
        summary: "naceSummary",
        keyHint: "keyHint",
        endpointLabel: "naceEndpoint",
        endpointHint: "naceEndpointHint",
        timeoutHint: "timeoutNaceHint",
        baseURL: "https://console.nace.ai",
        note: "naceImageRetentionHint"
      },
      {
        id: "meragpt",
        rowId: "system1-meragpt",
        label: "providerMeraGpt",
        summary: "meragptSummary",
        keyHint: "keyHint",
        endpointLabel: "meragptEndpoint",
        endpointHint: "meragptEndpointHint",
        timeoutHint: "timeoutMeraGptHint",
        baseURL: "https://meragpt.com"
      },
      {
        id: "liquid",
        rowId: "system1-liquid",
        label: "providerLiquid",
        summary: "liquidSummary",
        keyHint: "keyHint",
        endpointLabel: "liquidEndpoint",
        endpointHint: "liquidEndpointHint",
        timeoutHint: "timeoutLiquidHint",
        baseURL: LIQUID_BASE_URL
      },
      {
        id: "cloudflare",
        rowId: "system1-cloudflare",
        label: "providerCloudflare",
        summary: "cloudflareSummary",
        keyHint: "keyHint",
        endpointLabel: "cloudflareEndpoint",
        endpointHint: "cloudflareEndpointHint",
        timeoutHint: "timeoutCloudflareHint",
        baseURL: "https://api.cloudflare.com/client/v4",
        accountId: {
          path: "accountId",
          label: "cloudflareAccountId",
          hint: "cloudflareAccountIdHint"
        }
      }
    ];
    var inject = ["slots", "locale"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-system1 client copy");
      const releaseNotesLogger = ctx.logger("dsh-system1 release notes");
      const reportReleaseNoteIssue = (message) => releaseNotesLogger.warn(message);
      ctx.effect(
        () => ctx.slots.inject(
          "shell.overlay",
          () => ctx.slots.register(
            { name: "shell.overlay", id: "dsh-system1.release-notes", locale: NS },
            (props) => (0, import_react2.createElement)(ReleaseNotesOverlay, {
              ...props,
              log: reportReleaseNoteIssue
            })
          )
        ),
        "dsh-system1 release notes overlay"
      );
      ctx.inject(["remote", "remote.credentials", "configForms"], registerSettingsPages);
    }
    function registerSettingsPages(ctx) {
      ctx.effect(
        async () => await ctx.remote.$mount(settingsRemote),
        "dsh-system1 settings directory Remote"
      );
      ctx.effect(
        () => ctx.slots.inject(
          "plugins.bundle.config",
          () => ctx.slots.register(
            { name: "plugins.bundle.config", key: PACKAGE2, locale: NS },
            (props) => (0, import_react2.createElement)(BundleSettingsPage, { ...props, ctx })
          )
        ),
        "dsh-system1 bundle settings page"
      );
      for (const provider2 of PROVIDERS) {
        ctx.effect(
          () => ctx.slots.inject(
            "plugins.row.config",
            () => ctx.slots.register(
              { name: "plugins.row.config", key: `${PACKAGE2}#${provider2.rowId}`, locale: NS },
              (props) => (0, import_react2.createElement)(ProviderSettingsPage, { ...props, ctx, provider: provider2 })
            )
          ),
          `dsh-system1 ${provider2.id} settings page`
        );
      }
    }
    function useSettingsForm(scope, specs, secrets = []) {
      const baseOf = (0, import_react2.useCallback)(
        (field) => objectValue(scope.getSnapshot().base)[field],
        [scope]
      );
      const model2 = (0, import_react2.useMemo)(
        () => new import_dsh_client_ui_primitives2.SettingsFormModel(scope, specs, secrets),
        [scope, specs, secrets]
      );
      (0, import_react2.useEffect)(() => () => model2.dispose(), [model2]);
      const store = (0, import_react2.useMemo)(() => model2.bind(() => ({
        shell: model2.shell(),
        fields: Object.fromEntries([
          ...specs.map((spec) => {
            const state = model2.field(spec.field);
            return [spec.field, {
              ...state,
              overridden: overriddenAgainstDefault(state, spec, baseOf(spec.field))
            }];
          }),
          ...secrets.map(({ field }) => [field, model2.field(field)])
        ])
      })), [model2, specs, secrets, baseOf]);
      const subscribe = (0, import_react2.useCallback)((listener) => store.subscribe(listener), [store]);
      const getSnapshot = (0, import_react2.useCallback)(() => store.getSnapshot(), [store]);
      const view = (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
      const actions = (0, import_react2.useMemo)(() => model2.actions(), [model2]);
      return { view, actions };
    }
    function useConfigScope(ctx, entryId) {
      const scope = (0, import_react2.useMemo)(() => ctx.configForms.get(entryId), [ctx, entryId]);
      const subscribe = (0, import_react2.useCallback)((listener) => scope.subscribe(listener), [scope]);
      const getStatus = (0, import_react2.useCallback)(() => scope.getSnapshot().status, [scope]);
      const status = (0, import_react2.useSyncExternalStore)(subscribe, getStatus, getStatus);
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
          value: rows.map(({ provider: provider2, model: model2 }) => ({ provider: provider2.trim(), model: model2.trim() }))
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
    var BUNDLE_SPECS = [defaultModelSpec, fallbackModelsSpec, {
      field: "enabled",
      format: (value) => typeof value === "boolean" ? String(value) : "",
      parse: (text) => text === "true" || text === "false" ? { kind: "set", value: text === "true" } : void 0
    }];
    var OPERATION_SPECS = [...BUNDLE_SPECS, {
      field: "agentEnabled",
      format: (value) => value === true ? "true" : "false",
      parse: (text) => text === "true" || text === "false" ? { kind: "set", value: text === "true" } : void 0
    }];
    var NO_SECRETS = [];
    var settingsPageStyle = { display: "flex", flexDirection: "column", gap: 16 };
    var GITHUB_ISSUE_URLS = {
      bug: "https://github.com/exoticknight/dsh-system1/issues/new?template=bug_report.yml",
      provider: "https://github.com/exoticknight/dsh-system1/issues/new?template=provider_request.yml",
      model: "https://github.com/exoticknight/dsh-system1/issues/new?template=model_request.yml"
    };
    var issueLinkLabels = {
      bug: "reportIssue",
      provider: "requestProvider",
      model: "requestModel"
    };
    function BundleSettingsPage(props) {
      const { t } = props;
      const { scope, status } = useConfigScope(props.ctx, "system1");
      if (props.view === "summary") return (0, import_react2.createElement)("p", null, t("coreSummary"));
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        (0, import_react2.createElement)(
          "div",
          null,
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
            variant: "ghost",
            size: "sm",
            icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconInfoOutlineRegular, { size: 14 }),
            onClick: requestManualReleaseNotes
          }, t("releaseEntry"))
        ),
        (0, import_react2.createElement)(
          "div",
          { style: settingsPageStyle },
          settingsState(t, status) ?? (0, import_react2.createElement)(CatalogSettings, { t, ctx: props.ctx, scope }),
          (0, import_react2.createElement)(IssueLinks, { t, kinds: ["bug", "provider", "model"], prompt: "feedbackPrompt" })
        )
      );
    }
    function useCatalog(ctx) {
      const [view, setView] = (0, import_react2.useState)({ status: "loading" });
      (0, import_react2.useEffect)(() => {
        const fiber = ctx.inject(["remote.system1Settings"], (remoteCtx) => {
          let timer;
          let disposed = false;
          let stop;
          setView({ status: "loading" });
          const connect = async () => {
            try {
              const stream = remoteCtx.remote.$stream({
                name: "System1 settings directory",
                open: (signal) => remoteCtx.remote.system1Settings.watch(signal),
                ended: () => new Error("System1 settings directory closed"),
                carrierFailed: () => {
                  if (!disposed) setView((view2) => ({ ...view2, status: "unavailable" }));
                }
              });
              stop = () => stream.dispose();
              for await (const item of stream) {
                const catalog2 = projectCatalog(item.value);
                item.accept();
                if (!disposed) setView({ status: "ready", catalog: catalog2 });
              }
            } catch {
            } finally {
              if (!disposed) {
                setView((view2) => ({ ...view2, status: "unavailable" }));
                timer = setTimeout(() => {
                  void connect();
                }, 2e3);
              }
            }
          };
          void connect();
          return () => {
            disposed = true;
            clearTimeout(timer);
            void stop?.();
          };
        });
        return () => {
          void fiber.dispose();
        };
      }, [ctx]);
      return view;
    }
    function providerLabel(t, id2) {
      const provider2 = PROVIDERS.find((item) => item.id === id2);
      return provider2 ? t(provider2.label) : id2;
    }
    function modelLabel(t, provider2, id2) {
      const key = provider2 === "laya" && Object.hasOwn(LAYA_MODEL_LABELS, id2) ? LAYA_MODEL_LABELS[id2] : void 0;
      return key ? `${t(key)} (${id2})` : id2;
    }
    function operationTitle(ctx, entry) {
      return localized(ctx, entry.title, Object.entries(entry.translations ?? {}).map(([locale, copy]) => [locale, copy.title]));
    }
    function operationDescription(ctx, entry) {
      return localized(ctx, entry.description ?? "", Object.entries(entry.translations ?? {}).flatMap(([locale, copy]) => copy.description ? [[locale, copy.description]] : []));
    }
    function inputLabel(ctx, input) {
      return localized(ctx, input.title, Object.entries(input.translations ?? {}));
    }
    function inputLabels(ctx, entry, inputs) {
      return inputs.map((id2) => {
        const kind = entry.inputKinds.find((input) => input.id === id2);
        return kind ? inputLabel(ctx, kind) : id2;
      }).join(", ");
    }
    function localized(ctx, en2, entries) {
      const translations = Object.fromEntries(entries.map(([locale, copy]) => [locale.toLowerCase(), copy]));
      return ctx.locale.resolveText({ zh: translations["zh-cn"], ...translations, en: en2 });
    }
    function CatalogSettings(props) {
      const { t, ctx, scope } = props;
      const view = useCatalog(ctx);
      const [operation, setOperation] = (0, import_react2.useState)("decide");
      const tabsId = (0, import_react2.useId)();
      const operationsHeading = (0, import_react2.useId)();
      if (!view.catalog) return (0, import_react2.createElement)(
        "p",
        { role: "status", style: settingsHintStyle },
        t(view.status === "loading" ? "loading" : "directoryUnavailable")
      );
      const entries = view.catalog.operations;
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        view.status !== "ready" && (0, import_react2.createElement)("p", { role: "status", style: settingsHintStyle }, t("directoryUnavailable")),
        (0, import_react2.createElement)(
          "section",
          { style: settingsPageStyle, "aria-labelledby": operationsHeading },
          (0, import_react2.createElement)("h3", { id: operationsHeading, style: directoryTitleStyle }, t("operationDirectory")),
          (0, import_react2.createElement)(OperationDirectory, {
            t,
            ctx,
            scope,
            entries,
            id: tabsId,
            operation,
            onChange: setOperation,
            directoryReady: view.status === "ready"
          })
        )
      );
    }
    function OperationDirectory(props) {
      const { t, ctx, scope, entries, id: id2, operation, onChange, directoryReady } = props;
      const items = entries.map((entry) => ({
        value: entry.id,
        label: operationTitle(ctx, entry),
        render: () => (0, import_react2.createElement)(OperationSettings, { key: entry.version, t, ctx, scope, entry, directoryReady })
      }));
      return (0, import_react2.createElement)(SettingsTabs, { id: id2, label: t("operationDirectory"), items, value: operation, onChange });
    }
    function tabDomId(prefix, value) {
      return `${prefix}-tab-${encodeURIComponent(value)}`;
    }
    function SettingsTabs(props) {
      const { id: id2, label, items, value, onChange } = props;
      const selected = items.find((item) => item.value === value)?.value ?? items[0]?.value;
      const visited = (0, import_react2.useRef)(/* @__PURE__ */ new Set());
      (0, import_react2.useEffect)(() => {
        if (selected) visited.current.add(selected);
      }, [selected]);
      const [first, ...rest] = items.map(({ value: value2, label: label2 }) => ({
        value: value2,
        label: label2,
        id: tabDomId(id2, value2),
        panelId: `${tabDomId(id2, value2)}-panel`
      }));
      if (!selected || !first) return null;
      const minTabWidth = Math.max(...items.map(({ label: label2 }) => label2.length * 7 + 28), 72);
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        (0, import_react2.createElement)(
          "div",
          { style: scrollTabsStyle },
          (0, import_react2.createElement)(
            "div",
            { style: { minWidth: minTabWidth * items.length } },
            (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SegmentedTabs, { label, value: selected, onChange, items: [first, ...rest] })
          )
        ),
        ...items.map(({ value: value2, render }) => {
          const tabId = tabDomId(id2, value2);
          return (0, import_react2.createElement)("section", {
            key: value2,
            id: `${tabId}-panel`,
            role: "tabpanel",
            "aria-labelledby": tabId,
            hidden: selected !== value2
          }, selected === value2 || visited.current.has(value2) ? render() : null);
        })
      );
    }
    function ProviderModelList(props) {
      const { t, ctx, instanceId, provider: provider2, view } = props;
      const heading = (0, import_react2.useId)();
      const models = instanceId ? providerModels(view.catalog?.operations ?? [], instanceId) : void 0;
      return (0, import_react2.createElement)(
        "section",
        { style: settingsPageStyle, "aria-labelledby": heading },
        (0, import_react2.createElement)("h4", { id: heading, style: directoryTitleStyle }, t("providerModels")),
        view.status !== "ready" && (0, import_react2.createElement)(
          "p",
          { role: "status", style: settingsHintStyle },
          t(view.status === "loading" ? "loading" : "directoryUnavailable")
        ),
        view.status === "ready" && !models?.size && (0, import_react2.createElement)(
          "p",
          { style: settingsHintStyle },
          t(instanceId ? "providerModelsUnavailable" : "providerInstanceUnavailable")
        ),
        ...[...models ?? []].map(([id2, usage]) => {
          const labels = usage.flatMap(({ entry, positions }) => {
            const operation = operationTitle(ctx, entry);
            return positions.map((position) => (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Tag, {
              key: `${entry.id}:${position.kind === "primary" ? 0 : position.index}`,
              tone: "neutral"
            }, position.kind === "primary" ? t("modelRoutePrimary", { operation }) : t("modelRouteFallback", { operation, index: position.index })));
          });
          return (0, import_react2.createElement)(
            "section",
            { key: id2, style: directoryCardStyle },
            (0, import_react2.createElement)("h5", { style: sectionTitleStyle }, id2 ? modelLabel(t, provider2.id, id2) : t("chooseDeployment")),
            (0, import_react2.createElement)(
              "ul",
              { style: catalogListStyle, "aria-label": t("declaredSupport") },
              ...usage.map(({ entry, inputs }) => (0, import_react2.createElement)(
                "li",
                { key: entry.id },
                operationTitle(ctx, entry),
                inputs.length ? ` \xB7 ${inputLabels(ctx, entry, inputs)}` : ""
              ))
            ),
            labels.length ? (0, import_react2.createElement)("div", { style: modelUsageStyle }, ...labels) : (0, import_react2.createElement)("p", { style: settingsHintStyle }, t("unusedModel"))
          );
        })
      );
    }
    function IssueLinks(props) {
      return (0, import_react2.createElement)(
        "div",
        { style: issueLinksSectionStyle },
        (0, import_react2.createElement)("p", { style: settingsHintStyle }, props.t(props.prompt)),
        (0, import_react2.createElement)(
          "nav",
          { "aria-label": props.t(props.prompt), style: issueLinksStyle },
          ...props.kinds.map((kind) => (0, import_react2.createElement)("a", {
            key: kind,
            href: GITHUB_ISSUE_URLS[kind],
            target: "_blank",
            rel: "noopener noreferrer",
            style: issueLinkStyle
          }, props.t(issueLinkLabels[kind]), (0, import_react2.createElement)("span", { "aria-hidden": true }, " \u2197")))
        )
      );
    }
    function OperationSettings(props) {
      const { t, ctx, entry } = props;
      const prefix = (0, import_react2.useId)();
      const decide = entry.id === "decide";
      const scope = (0, import_react2.useMemo)(() => routeScope(props.scope, entry.id, entry.version), [props.scope, entry.id, entry.version]);
      const { view, actions } = useSettingsForm(scope, decide || !entry.tool ? BUNDLE_SPECS : OPERATION_SPECS, NO_SECRETS);
      const disabled = !props.directoryReady || !view.shell.writable || view.shell.saving;
      const enabled = view.fields.enabled?.text === "true";
      const defaultField = view.fields.defaultModel;
      const defaultRow = readFallbackModels([parseJson(defaultField.text)])[0];
      const fallbackField = view.fields.fallbackModels;
      const fallbacks = readFallbackModels(parseJson(fallbackField.text));
      const editFallbacks = (rows) => actions.edit("fallbackModels", JSON.stringify(rows));
      const agentEnabled = view.fields.agentEnabled?.text === "true";
      const primaryAvailable = !!describeCandidate(entry, defaultRow);
      const savedPrimaryAvailable = entry.route.compatible && entry.route.defaultModel && !!describeCandidate(entry, entry.route.defaultModel);
      const changedPrimary = defaultRow.provider !== (entry.route.defaultModel?.provider ?? "") || defaultRow.model !== (entry.route.defaultModel?.model ?? "");
      const missingPrimary = enabled && agentEnabled && !primaryAvailable && (!entry.route.agentEnabled || changedPrimary || !entry.route.compatible);
      const configuredProviders = new Set([defaultRow, ...fallbacks].map(({ provider: provider2 }) => provider2).filter(Boolean));
      const description = operationDescription(ctx, entry);
      const title = operationTitle(ctx, entry);
      const enableLabel = t("featureEnable", { operation: title });
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        (0, import_react2.createElement)(
          "header",
          { style: catalogHeadingStyle },
          (0, import_react2.createElement)("h3", { style: sectionTitleStyle }, title),
          description && (0, import_react2.createElement)("p", { style: settingsHintStyle }, description)
        ),
        !entry.route.compatible && (0, import_react2.createElement)("p", { role: "note", style: warningStyle }, t("routeVersionMismatch")),
        (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsForm, {
          labels: settingsFormLabels(t),
          state: missingPrimary || !props.directoryReady ? { ...view.shell, invalid: true } : view.shell,
          onSave: actions.save,
          onDiscard: actions.discard,
          children: [
            (0, import_react2.createElement)(
              "section",
              { key: "enable", style: featureSwitchCardStyle },
              (0, import_react2.createElement)(
                "div",
                { style: catalogHeadingStyle },
                (0, import_react2.createElement)("h4", { style: sectionTitleStyle }, enableLabel),
                (0, import_react2.createElement)("p", { style: settingsHintStyle }, t("featureSwitchHelp")),
                !enabled && (0, import_react2.createElement)("p", { style: warningStyle }, t("featureOff"))
              ),
              (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Switch, {
                checked: enabled,
                label: enableLabel,
                disabled,
                onChange: (checked) => actions.edit("enabled", String(checked))
              })
            ),
            (0, import_react2.createElement)(
              SelectField,
              {
                key: "default",
                id: `${prefix}-default-model`,
                label: t("model"),
                hint: t(decide ? "defaultHint" : "operationDefaultHint"),
                overridden: defaultField.overridden,
                invalid: defaultField.invalid,
                invalidLabel: t("required"),
                disabled,
                t,
                onReset: () => actions.resetField("defaultModel")
              },
              (0, import_react2.createElement)(
                "div",
                { style: modelPairStyle },
                modelSelectors(
                  t,
                  ctx,
                  entry,
                  `${prefix}-default`,
                  "model",
                  defaultRow,
                  disabled,
                  defaultField.invalid,
                  (row) => actions.edit("defaultModel", JSON.stringify(row))
                )
              ),
              !decide && defaultField.text && (0, import_react2.createElement)("button", {
                type: "button",
                style: textLinkStyle,
                disabled,
                onClick: () => actions.edit("defaultModel", "")
              }, t("clearModel"))
            ),
            (0, import_react2.createElement)(
              SelectField,
              {
                key: "fallbacks",
                id: `${prefix}-fallback-models`,
                label: t("fallbackModels"),
                hint: t("fallbackHint"),
                overridden: fallbackField.overridden,
                invalid: fallbackField.invalid,
                invalidLabel: t("fallbackRequired"),
                disabled,
                t,
                onReset: () => actions.resetField("fallbackModels")
              },
              fallbacks.map((row, index) => (0, import_react2.createElement)(
                "div",
                { key: index, style: fallbackRowStyle },
                (0, import_react2.createElement)(
                  "div",
                  { style: modelPairStyle },
                  modelSelectors(
                    t,
                    ctx,
                    entry,
                    `${prefix}-fallback-${index}`,
                    "fallbackModel",
                    row,
                    disabled,
                    fallbackField.invalid,
                    (next) => editFallbacks(updateFallbackModel(fallbacks, index, next))
                  )
                ),
                (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
                  variant: "ghost",
                  size: "sm",
                  icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconChevronUpOutlineRegular, { size: 13 }),
                  disabled: disabled || index === 0,
                  "aria-label": `${t("fallbackUp")} ${index + 1}`,
                  title: t("fallbackUp"),
                  onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, -1))
                }),
                (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
                  variant: "ghost",
                  size: "sm",
                  icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconChevronDownOutlineRegular, { size: 13 }),
                  disabled: disabled || index === fallbacks.length - 1,
                  "aria-label": `${t("fallbackDown")} ${index + 1}`,
                  title: t("fallbackDown"),
                  onClick: () => editFallbacks(moveFallbackModel(fallbacks, index, 1))
                }),
                (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
                  variant: "ghost",
                  size: "sm",
                  icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconTrashOutlineRegular, { size: 13 }),
                  disabled,
                  "aria-label": `${t("fallbackRemove")} ${index + 1}`,
                  title: t("fallbackRemove"),
                  onClick: () => editFallbacks(removeFallbackModel(fallbacks, index))
                })
              )),
              (0, import_react2.createElement)("div", null, (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
                variant: "outline",
                size: "sm",
                icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconPlusOutlineRegular, { size: 13 }),
                disabled: disabled || entry.providers.length === 0,
                onClick: () => editFallbacks(addFallbackModel(fallbacks, { provider: "", model: "" }))
              }, t("fallbackAdd")))
            ),
            entry.providers.length === 0 && (0, import_react2.createElement)("p", { key: "no-providers", style: settingsHintStyle }, t("noProviders")),
            configuredProviders.size > 1 && (0, import_react2.createElement)("p", { key: "transfer-warning", style: warningStyle }, t("crossProviderWarning")),
            !decide && (0, import_react2.createElement)(
              "section",
              { key: "preview", style: routeCardStyle, "aria-label": t("routePreview") },
              (0, import_react2.createElement)("h4", { style: sectionTitleStyle }, t("routePreview")),
              (0, import_react2.createElement)("dl", { style: previewStyle }, ...previewRoute(entry, [defaultRow, ...fallbacks]).flatMap(({ input, candidates }) => [
                (0, import_react2.createElement)("dt", { key: `${input.id}-label`, style: previewLabelStyle }, inputLabel(ctx, input)),
                (0, import_react2.createElement)(
                  "dd",
                  { key: `${input.id}-route`, style: previewValueStyle },
                  candidates.length === 0 ? t("emptyRoute") : candidates.map(({ provider: provider2, model: model2 }) => `${providerLabel(t, provider2)} / ${modelLabel(t, provider2, model2)}`).join(" \u2192 ")
                )
              ]))
            ),
            entry.tool && (0, import_react2.createElement)(
              "section",
              { key: "agent", style: routeCardStyle },
              (0, import_react2.createElement)(
                "div",
                { style: fieldHeadStyle },
                (0, import_react2.createElement)("h4", { style: { ...sectionTitleStyle, ...fieldLabelStyle } }, t("agentTool")),
                (0, import_react2.createElement)(
                  import_dsh_client_ui_primitives2.Tag,
                  { tone: "neutral" },
                  t(!entry.route.agentEnabled ? "agentToolDisabled" : !entry.route.enabled ? "agentToolFeatureOff" : entry.agentAvailable ? "agentToolEnabled" : savedPrimaryAvailable ? "agentToolUnmounted" : "agentToolUnavailable")
                )
              ),
              decide ? (0, import_react2.createElement)("p", { style: settingsHintStyle }, t("agentToolLegacy")) : (0, import_react2.createElement)(
                "label",
                { style: checkboxStyle },
                (0, import_react2.createElement)("input", {
                  type: "checkbox",
                  checked: agentEnabled,
                  disabled: disabled || !agentEnabled && !primaryAvailable,
                  onChange: (event) => actions.edit("agentEnabled", String(event.currentTarget.checked))
                }),
                entry.tool.name
              ),
              !decide && !primaryAvailable && (0, import_react2.createElement)("p", { style: missingPrimary ? warningStyle : settingsHintStyle }, t("agentToolNeedsPrimary"))
            )
          ]
        })
      );
    }
    function modelSelectors(t, ctx, entry, idPrefix, modelField, row, disabled, invalid, onChange) {
      const info = entry.providers.find((candidate) => candidate.id === row.provider);
      const supported = describeCandidate(entry, row)?.inputs;
      const models = info?.models.kind === "fixed" ? info.models.models : [];
      const providerOptions = [
        ...!info && row.provider ? [{ id: row.provider, label: `${t("providerUnknown")}: ${row.provider}` }] : [],
        ...entry.providers.map(({ id: id2 }) => ({ id: id2, label: providerLabel(t, id2) }))
      ];
      const modelOptions = [
        ...row.model && !models.some((candidate) => candidate.id === row.model) ? [{ id: row.model, label: describeCandidate(entry, row) ? row.model : `${row.model} \xB7 ${t("unavailableModel")}` }] : [],
        ...models.map(({ id: id2 }) => ({
          id: id2,
          label: modelLabel(t, row.provider, id2)
        }))
      ];
      return [
        (0, import_react2.createElement)(Dropdown, {
          key: "provider",
          id: `${idPrefix}-provider`,
          label: t("provider"),
          value: row.provider,
          placeholder: t("fallbackChooseService"),
          options: providerOptions,
          disabled: disabled || providerOptions.length === 0,
          invalid,
          onChange: (provider2) => {
            const next = entry.providers.find((candidate) => candidate.id === provider2)?.models;
            onChange({ provider: provider2, model: next?.kind === "fixed" ? next.models[0]?.id ?? "" : "" });
          }
        }),
        info?.models.kind === "deployment" ? (0, import_react2.createElement)("input", {
          key: "model",
          id: `${idPrefix}-model`,
          type: "text",
          style: deploymentInputStyle,
          autoComplete: "off",
          "aria-label": t("chooseDeployment"),
          "aria-invalid": invalid || void 0,
          placeholder: t("chooseDeployment"),
          value: row.model,
          disabled,
          onChange: (event) => onChange({ ...row, model: event.currentTarget.value })
        }) : (0, import_react2.createElement)(Dropdown, {
          key: "model",
          id: `${idPrefix}-model`,
          label: t(modelField),
          value: row.model,
          placeholder: t("fallbackChooseModel"),
          options: modelOptions,
          disabled: disabled || !info,
          invalid,
          onChange: (model2) => onChange({ ...row, model: model2 })
        }),
        !!supported?.length && (0, import_react2.createElement)(
          "p",
          { key: "supported", style: modelSupportStyle },
          t("modelSupports", { inputs: inputLabels(ctx, entry, supported) })
        )
      ];
    }
    function Dropdown(props) {
      const [open, setOpen] = (0, import_react2.useState)(false);
      const current = props.options.find((option) => option.id === props.value);
      return (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Menu, {
        open,
        onClose: () => setOpen(false),
        items: props.options,
        ...current ? { selectedId: current.id } : {},
        onSelect: (id2) => {
          setOpen(false);
          if (id2 !== props.value) props.onChange(id2);
        },
        align: "start",
        portal: true,
        anchor: (0, import_react2.createElement)(
          "button",
          {
            id: props.id,
            type: "button",
            "aria-label": props.label,
            "aria-description": current?.label,
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
          (0, import_react2.createElement)("span", { style: dropdownLabelStyle }, current?.label ?? props.placeholder),
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconChevronDownOutlineRegular, { size: 12 })
        )
      });
    }
    function SelectField(props) {
      return (0, import_react2.createElement)(
        "div",
        { role: "group", "aria-labelledby": `${props.id}-label`, style: fieldStyle },
        (0, import_react2.createElement)(
          "div",
          { style: fieldHeadStyle },
          (0, import_react2.createElement)("span", { id: `${props.id}-label`, style: fieldLabelStyle }, props.label),
          props.overridden && (0, import_react2.createElement)(
            "span",
            { style: fieldBadgesStyle },
            (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Tag, { tone: "neutral" }, props.t("overridden")),
            (0, import_react2.createElement)("button", {
              type: "button",
              style: fieldResetStyle,
              disabled: props.disabled,
              onClick: props.onReset
            }, props.t("reset"))
          )
        ),
        (0, import_react2.createElement)("div", { style: selectStackStyle }, props.children),
        (0, import_react2.createElement)(
          "p",
          { style: props.invalid ? fieldInvalidStyle : settingsHintStyle },
          props.invalid ? props.invalidLabel : props.hint
        )
      );
    }
    function ProviderSettingsPage(props) {
      if (props.view === "summary") return (0, import_react2.createElement)("p", null, props.t(props.provider.summary));
      return (0, import_react2.createElement)(ProviderSettingsDetail, props);
    }
    function ProviderSettingsDetail(props) {
      const { t, provider: provider2, ctx } = props;
      const { scope, status } = useConfigScope(ctx, provider2.rowId);
      const connectionHeading = (0, import_react2.useId)();
      const view = useCatalog(ctx);
      const instance = providerComponent(view.catalog?.providerComponents, provider2.rowId, `${PACKAGE2}/providers/${provider2.id}`);
      const keyRef = view.status === "ready" ? instance?.keyRef : void 0;
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        (0, import_react2.createElement)(
          "section",
          { "aria-labelledby": connectionHeading },
          (0, import_react2.createElement)("h4", { id: connectionHeading, style: directoryTitleStyle }, t("connectionSettings")),
          instance && (0, import_react2.createElement)("p", { style: settingsHintStyle }, t("providerInstanceId"), ": ", (0, import_react2.createElement)("code", null, instance.providerId)),
          settingsState(t, status) ?? (0, import_react2.createElement)(ProviderSettingsForm, { key: keyRef ?? "unavailable", t, provider: provider2, keyRef, scope, ctx })
        ),
        status === "ready" && (0, import_react2.createElement)(ProviderModelList, { t, ctx, instanceId: instance?.providerId, provider: provider2, view }),
        (0, import_react2.createElement)(IssueLinks, { t, kinds: ["bug"], prompt: "providerFeedbackPrompt" })
      );
    }
    function ProviderSettingsForm(props) {
      const { t, provider: provider2, ctx, keyRef } = props;
      const [credential, setCredential] = (0, import_react2.useState)({ available: keyRef !== void 0, configured: false, writable: true });
      const refresh = (0, import_react2.useCallback)(async () => {
        if (keyRef === void 0) return;
        try {
          const response = await ctx.remote.credentials.describe([keyRef]);
          if (!response.ok) {
            setCredential((current) => ({ ...current, available: false }));
            return;
          }
          const info = response.value[keyRef];
          setCredential({
            available: true,
            configured: info?.configured ?? false,
            writable: info?.writable ?? true
          });
        } catch {
          setCredential((current) => ({ ...current, available: false }));
        }
      }, [ctx, keyRef]);
      (0, import_react2.useEffect)(() => {
        void refresh();
        return ctx.remote.$on("credentials/reference-updated", (ref) => {
          if (ref === keyRef) void refresh();
        });
      }, [ctx, keyRef, refresh]);
      const specs = (0, import_react2.useMemo)(
        () => provider2.accountId ? [endpointSpec, accountIdSpec, timeoutSpec] : [endpointSpec, timeoutSpec],
        [provider2]
      );
      const secrets = (0, import_react2.useMemo)(() => [{
        field: "apiKey",
        write: async (text) => {
          if (keyRef === void 0) return false;
          const response = await ctx.remote.credentials.set(keyRef, text);
          await refresh();
          return response.ok;
        }
      }], [ctx, keyRef, refresh]);
      const { view, actions } = useSettingsForm(props.scope, specs, secrets);
      const disabled = !view.shell.writable;
      const accountId = provider2.accountId;
      return (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsForm, {
        labels: settingsFormLabels(t),
        state: view.shell,
        onSave: actions.save,
        onDiscard: actions.discard,
        children: [
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsSecretField, {
            key: "key",
            id: `dsh-system1-${provider2.id}-api-key`,
            label: t("key"),
            hint: !credential.available ? t("keyUnavailable") : !credential.writable ? t("keyReadOnly") : t(provider2.keyHint),
            disabled: !credential.available || !credential.writable,
            text: view.fields.apiKey.text,
            configured: credential.available && credential.configured,
            stateLabel: !credential.available ? t("keyStatusUnavailable") : credential.configured ? t("keyStatusConfigured") : t("keyStatusMissing"),
            onEdit: (text) => actions.edit("apiKey", text)
          }),
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
            key: "endpoint",
            id: `dsh-system1-${provider2.id}-endpoint`,
            label: t(provider2.endpointLabel),
            hint: t(provider2.endpointHint),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidEndpoint"),
            placeholder: provider2.baseURL,
            disabled,
            ...view.fields.baseURL,
            onEdit: (text) => actions.edit("baseURL", text),
            onReset: () => actions.resetField("baseURL")
          }),
          accountId && (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
            key: "account",
            id: `dsh-system1-${provider2.id}-${accountId.path}`,
            label: t(accountId.label),
            hint: t(accountId.hint),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidAccountId"),
            disabled,
            ...view.fields[accountId.path],
            onEdit: (text) => actions.edit(accountId.path, text),
            onReset: () => actions.resetField(accountId.path)
          }),
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
            key: "timeout",
            id: `dsh-system1-${provider2.id}-timeout`,
            label: t("timeout"),
            hint: t(provider2.timeoutHint),
            overriddenLabel: t("overridden"),
            resetLabel: t("reset"),
            invalidLabel: t("invalidTimeout"),
            numeric: true,
            disabled,
            ...view.fields.timeoutMs,
            onEdit: (text) => actions.edit("timeoutMs", text),
            onReset: () => actions.resetField("timeoutMs")
          }),
          provider2.note && (0, import_react2.createElement)("p", { key: "note", style: settingsHintStyle }, t(provider2.note))
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
      if (status === "loading") return (0, import_react2.createElement)("p", { role: "status", style: settingsHintStyle }, t("loading"));
      if (status === "unavailable" || status === void 0)
        return (0, import_react2.createElement)("p", { role: "note", style: settingsHintStyle }, t("unavailable"));
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
    var modelSupportStyle = { ...settingsHintStyle, gridColumn: "1 / -1" };
    var issueLinksSectionStyle = { display: "flex", flexDirection: "column", gap: 8 };
    var issueLinksStyle = { display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: 13, lineHeight: 1.5 };
    var issueLinkStyle = {
      color: "var(--dsw-alias-label-secondary)",
      textDecoration: "underline",
      textUnderlineOffset: 3
    };
    var scrollTabsStyle = { overflowX: "auto", minWidth: 0 };
    var directoryTitleStyle = {
      margin: 0,
      flex: 1,
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-primary)"
    };
    var catalogHeadingStyle = { display: "flex", flexDirection: "column", gap: 5 };
    var sectionTitleStyle = {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.5,
      color: "var(--dsw-alias-label-primary)"
    };
    var directoryCardStyle = {
      display: "grid",
      gap: 8,
      padding: "12px 14px",
      borderRadius: "var(--dsw-radius-md)",
      background: "var(--dsw-alias-bg-module-platform)"
    };
    var routeCardStyle = { ...directoryCardStyle, marginTop: 8 };
    var featureSwitchCardStyle = {
      ...directoryCardStyle,
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      padding: "14px 16px"
    };
    var catalogListStyle = { margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 };
    var modelUsageStyle = { display: "flex", flexWrap: "wrap", gap: 6 };
    var textLinkStyle = {
      border: 0,
      padding: 0,
      background: "none",
      font: "inherit",
      fontSize: 13,
      textAlign: "start",
      color: "var(--dsw-alias-label-primary)",
      textDecoration: "underline",
      textUnderlineOffset: 3,
      cursor: "pointer"
    };
    var warningStyle = {
      ...settingsHintStyle,
      color: "var(--dsw-alias-label-secondary)",
      paddingInlineStart: 10,
      borderInlineStart: "2px solid currentColor"
    };
    var previewStyle = {
      display: "grid",
      gridTemplateColumns: "minmax(2ch, auto) 1fr",
      margin: 0,
      gap: "5px 14px",
      fontSize: 13,
      lineHeight: 1.5
    };
    var previewLabelStyle = { fontWeight: 500 };
    var previewValueStyle = { margin: 0, overflowWrap: "anywhere" };
    var checkboxStyle = { display: "flex", gap: 6, alignItems: "center", fontSize: 13 };
    var deploymentInputStyle = {
      ...dropdownTriggerStyle,
      boxSizing: "border-box",
      border: "1px solid currentColor",
      cursor: "text"
    };

    return module.exports;
  },
});
