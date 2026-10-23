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

    // src/providers/cloudflare/models.ts
    var CLOUDFLARE_MODELS = [
      { id: "clef", aliases: ["@cf/cloudflare/clef"] },
      { id: "clef-flash", aliases: ["@cf/cloudflare/clef-flash"] },
      { id: "clef-omni", aliases: ["@cf/cloudflare/clef-omni"] }
    ];

    // src/providers/laya/models.ts
    var LAYA_MODELS = [
      { id: "auto" },
      { id: "english" },
      { id: "multilingual" },
      { id: "typed-decisions" }
    ];

    // src/providers/nace/models.ts
    var NACE_MODELS = [
      { id: "drex-v2.0" },
      { id: "drex-v1.5" },
      { id: "drex-max" }
    ];

    // src/providers/typesafe/models.ts
    var TYPESAFE_MODELS = [
      { id: "jev-latest" },
      { id: "jev-preview" },
      { id: "jev-1.14.0" },
      { id: "jev-1.13.0" }
    ];

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
      '{"id":"0.3.2","version":"0.3.2","highlights":{"zh":[{"kind":"fixed","title":"\u5207\u5230\u540E\u53F0\u65F6\u4E0D\u518D\u9519\u8FC7\u66F4\u65B0\u63D0\u793A","description":"\u65B0\u7248\u52A0\u8F7D\u65F6\u5982\u679C\u9875\u9762\u6070\u597D\u4E0D\u5728\u524D\u53F0\uFF0C\u66F4\u65B0\u6458\u8981\u4F1A\u5728\u56DE\u5230\u9875\u9762\u540E\u518D\u51FA\u73B0\uFF0C\u800C\u4E0D\u662F\u88AB\u8DF3\u8FC7\u3002"},{"kind":"fixed","title":"HTTP \u5730\u5740\u4E0B\u591A\u6807\u7B7E\u9875\u7684\u66F4\u65B0\u63D0\u793A\u4E0D\u518D\u5361\u4F4F","description":"\u901A\u8FC7\u5C40\u57DF\u7F51 HTTP \u5730\u5740\u4F7F\u7528\u65F6\uFF0C\u5173\u95ED\u6216\u5237\u65B0\u4E00\u4E2A\u6807\u7B7E\u9875\u4E0D\u4F1A\u518D\u8BA9\u5176\u4ED6\u6807\u7B7E\u9875\u7684\u66F4\u65B0\u63D0\u793A\u5EF6\u8FDF\u7EA6 30 \u79D2\u3002"},{"kind":"fixed","title":"\u66F4\u65B0\u63D0\u793A\u7684\u8BCA\u65AD\u65E5\u5FD7\u66F4\u51C6\u786E","description":"\u65E0\u6CD5\u5C55\u793A\u66F4\u65B0\u6458\u8981\u65F6\uFF0C\u65E5\u5FD7\u4F1A\u5199\u660E\u5177\u4F53\u539F\u56E0\uFF0C\u540C\u7C7B\u95EE\u9898\u4E0D\u518D\u91CD\u590D\u5237\u5C4F\u3002"}],"en":[{"kind":"fixed","title":"Update notices are no longer missed in background tabs","description":"If the page is not in the foreground when a new release loads, the summary now appears once you return instead of being skipped."},{"kind":"fixed","title":"Update notices no longer stall across tabs on HTTP addresses","description":"On a plain HTTP LAN address, closing or reloading one tab no longer delays the update notice in other tabs by about 30 seconds."},{"kind":"fixed","title":"Clearer update notice diagnostics","description":"When the summary cannot be shown, the log now states the reason, and repeated causes are logged only once."}]}}'
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
    var PACKAGE = "dsh-system1";
    var en = {
      coreSummary: "Choose a default model and ordered fallbacks, then set the shared request timeout.",
      provider: "Default service",
      providerTypesafe: "TypeSafe (Jev)",
      providerLaya: "Laya",
      providerNace: "Nace.AI Drex",
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
      timeoutHint: "Applies when a request has no timeout. Leave blank to use provider defaults (800 ms unless specified; Nace uses 60,000 ms).",
      providerEnabledHint: "Enable the matching service component in the list below.",
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
      naceSummary: "Configure Nace.AI Drex and its API Key.",
      typesafeEndpoint: "TypeSafe API base URL",
      typesafeEndpointHint: "The TypeSafe System One endpoint is appended automatically.",
      layaEndpoint: "Laya server base URL",
      layaEndpointHint: "Use the base URL of a Laya server exposing POST /v1/systemone.",
      naceEndpoint: "Nace API base URL",
      naceEndpointHint: "Use the Nace API root; POST /v1/systemone is appended automatically.",
      naceImageRetentionHint: "Drex Max images that exceed the 4 MiB request limit are uploaded as temporary files. DSH attempts deletion after each call; Nace keeps uploads for 24 hours by default, and backup removal can take up to 35 days.",
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
      coreSummary: "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B\u548C\u6309\u987A\u5E8F\u5C1D\u8BD5\u7684\u5907\u7528\u6A21\u578B\uFF0C\u5E76\u8BBE\u7F6E\u901A\u7528\u8BF7\u6C42\u8D85\u65F6\u3002",
      provider: "\u9ED8\u8BA4\u670D\u52A1",
      providerTypesafe: "TypeSafe\uFF08Jev\uFF09",
      providerLaya: "Laya",
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
      timeout: "\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",
      defaultHint: "\u51B3\u7B56\u8BF7\u6C42\u672A\u6307\u5B9A\u6A21\u578B\u65F6\u4F7F\u7528\u3002",
      timeoutHint: "\u8BF7\u6C42\u672A\u5355\u72EC\u6307\u5B9A\u8D85\u65F6\u65F6\u4F7F\u7528\u3002\u7559\u7A7A\u4F1A\u91C7\u7528\u670D\u52A1\u9ED8\u8BA4\u503C\uFF08\u901A\u5E38\u4E3A 800 \u6BEB\u79D2\uFF1BNace \u4E3A 60,000 \u6BEB\u79D2\uFF09\u3002",
      providerEnabledHint: "\u8BF7\u5728\u4E0B\u65B9\u7EC4\u4EF6\u5217\u8868\u4E2D\u542F\u7528\u5BF9\u5E94\u7684\u670D\u52A1\u7EC4\u4EF6\u3002",
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
      naceSummary: "\u914D\u7F6E Nace.AI Drex \u670D\u52A1\u548C API Key\u3002",
      typesafeEndpoint: "TypeSafe API \u6839\u5730\u5740",
      typesafeEndpointHint: "\u63D2\u4EF6\u4F1A\u81EA\u52A8\u5728\u5730\u5740\u540E\u62FC\u63A5 TypeSafe System One \u63A5\u53E3\u8DEF\u5F84\u3002",
      layaEndpoint: "Laya \u670D\u52A1\u6839\u5730\u5740",
      layaEndpointHint: "\u586B\u5199\u63D0\u4F9B POST /v1/systemone \u63A5\u53E3\u7684 Laya \u670D\u52A1\u6839\u5730\u5740\u3002",
      naceEndpoint: "Nace API \u6839\u5730\u5740",
      naceEndpointHint: "\u586B\u5199 Nace API \u6839\u5730\u5740\uFF1B\u63D2\u4EF6\u4F1A\u81EA\u52A8\u62FC\u63A5 POST /v1/systemone\u3002",
      naceImageRetentionHint: "Drex Max \u56FE\u7247\u8BF7\u6C42\u8D85\u8FC7 4 MiB \u65F6\u4F1A\u628A\u90E8\u5206\u56FE\u7247\u4F5C\u4E3A\u4E34\u65F6\u6587\u4EF6\u4E0A\u4F20\u3002DSH \u4F1A\u5728\u6BCF\u6B21\u8C03\u7528\u540E\u5C1D\u8BD5\u5220\u9664\uFF1BNace \u9ED8\u8BA4\u4FDD\u7559\u4E0A\u4F20\u6587\u4EF6 24 \u5C0F\u65F6\uFF0C\u5907\u4EFD\u4E2D\u7684\u6570\u636E\u6700\u957F\u53EF\u80FD\u9700\u8981 35 \u5929\u6E05\u9664\u3002",
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
        keyRef: "TYPESAFE_API_KEY",
        keyHint: "keyHint",
        endpointLabel: "typesafeEndpoint",
        endpointHint: "typesafeEndpointHint",
        baseURL: "https://api.typesafe.ai",
        models: TYPESAFE_MODELS.map(({ id }) => ({ id }))
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
        models: LAYA_MODELS.map(({ id }) => ({ id, label: LAYA_MODEL_LABELS[id] }))
      },
      {
        id: "nace",
        rowId: "system1-nace",
        label: "providerNace",
        summary: "naceSummary",
        keyRef: "NACE_API_KEY",
        keyHint: "keyHint",
        endpointLabel: "naceEndpoint",
        endpointHint: "naceEndpointHint",
        baseURL: "https://console.nace.ai",
        models: NACE_MODELS.map(({ id }) => ({ id })),
        note: "naceImageRetentionHint"
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
        models: CLOUDFLARE_MODELS.map(({ id }) => ({ id })),
        accountId: {
          path: "accountId",
          label: "cloudflareAccountId",
          hint: "cloudflareAccountIdHint",
          defaultValue: "",
          normalize: normalizeCloudflareAccountId
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
        () => ctx.slots.inject(
          "plugins.bundle.config",
          () => ctx.slots.register(
            { name: "plugins.bundle.config", key: PACKAGE, locale: NS },
            (props) => (0, import_react2.createElement)(BundleSettingsPage, { ...props, ctx })
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
              (props) => (0, import_react2.createElement)(ProviderSettingsPage, { ...props, ctx, provider })
            )
          ),
          `dsh-system1 ${provider.id} settings page`
        );
      }
    }
    function useSettingsForm(scope, specs, secrets = []) {
      const baseOf = (0, import_react2.useCallback)(
        (field) => objectValue(scope.getSnapshot().base)[field],
        [scope]
      );
      const model = (0, import_react2.useMemo)(
        () => new import_dsh_client_ui_primitives2.SettingsFormModel(scope, specs, secrets),
        [scope, specs, secrets]
      );
      (0, import_react2.useEffect)(() => () => model.dispose(), [model]);
      const store = (0, import_react2.useMemo)(() => model.bind(() => ({
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
      const subscribe = (0, import_react2.useCallback)((listener) => store.subscribe(listener), [store]);
      const getSnapshot = (0, import_react2.useCallback)(() => store.getSnapshot(), [store]);
      const view = (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
      const actions = (0, import_react2.useMemo)(() => model.actions(), [model]);
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
    var releaseSettingsPageStyle = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 };
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
        { style: releaseSettingsPageStyle },
        (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Button, {
          variant: "ghost",
          size: "sm",
          icon: (0, import_react2.createElement)(import_dsh_client_ui_primitives2.IconInfoOutlineRegular, { size: 14 }),
          onClick: requestManualReleaseNotes
        }, t("releaseEntry")),
        (0, import_react2.createElement)(
          "div",
          { style: settingsPageStyle },
          settingsState(t, status) ?? (0, import_react2.createElement)(BundleSettingsForm, { t, scope }),
          (0, import_react2.createElement)(IssueLinks, { t, kinds: ["bug", "provider", "model"], prompt: "feedbackPrompt" })
        )
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
      return (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsForm, {
        labels: settingsFormLabels(t),
        state: view.shell,
        onSave: actions.save,
        onDiscard: actions.discard,
        children: [
          (0, import_react2.createElement)(SelectField, {
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
          }, (0, import_react2.createElement)(
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
          (0, import_react2.createElement)(
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
            fallbacks.map((row, index) => (0, import_react2.createElement)(
              "div",
              { key: index, style: fallbackRowStyle },
              (0, import_react2.createElement)(
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
              disabled,
              onClick: () => editFallbacks(addFallbackModel(fallbacks, {
                provider: firstProvider.id,
                model: firstProvider.models[0]?.id ?? ""
              }))
            }, t("fallbackAdd")))
          ),
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
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
          (0, import_react2.createElement)("p", { key: "note", style: settingsHintStyle }, t("providerEnabledHint"))
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
        (0, import_react2.createElement)(Dropdown, {
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
        (0, import_react2.createElement)(Dropdown, {
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
      const [open, setOpen] = (0, import_react2.useState)(false);
      const current = props.options.find((option) => option.id === props.value);
      return (0, import_react2.createElement)(import_dsh_client_ui_primitives2.Menu, {
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
        anchor: (0, import_react2.createElement)(
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
      const { t, provider } = props;
      const { scope, status } = useConfigScope(props.ctx, provider.rowId);
      if (props.view === "summary") return (0, import_react2.createElement)("p", null, t(provider.summary));
      return (0, import_react2.createElement)(
        "div",
        { style: settingsPageStyle },
        settingsState(t, status) ?? (0, import_react2.createElement)(ProviderSettingsForm, { t, provider, scope, ctx: props.ctx }),
        (0, import_react2.createElement)(IssueLinks, { t, kinds: ["bug"], prompt: "providerFeedbackPrompt" })
      );
    }
    function ProviderSettingsForm(props) {
      const { t, provider, ctx } = props;
      const [credential, setCredential] = (0, import_react2.useState)({ available: true, configured: false, writable: true });
      const refresh = (0, import_react2.useCallback)(async () => {
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
      (0, import_react2.useEffect)(() => {
        void refresh();
        return ctx.remote.$on("credentials/reference-updated", (ref) => {
          if (ref === provider.keyRef) void refresh();
        });
      }, [ctx, provider.keyRef, refresh]);
      const specs = (0, import_react2.useMemo)(
        () => provider.accountId ? [endpointSpec, accountIdSpec] : [endpointSpec],
        [provider]
      );
      const secrets = (0, import_react2.useMemo)(() => [{
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
      return (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsForm, {
        labels: settingsFormLabels(t),
        state: view.shell,
        onSave: actions.save,
        onDiscard: actions.discard,
        children: [
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsSecretField, {
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
          (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
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
          accountId && (0, import_react2.createElement)(import_dsh_client_ui_primitives2.SettingsValueField, {
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
          }),
          provider.note && (0, import_react2.createElement)("p", { key: "note", style: settingsHintStyle }, t(provider.note))
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
    var issueLinksSectionStyle = { display: "flex", flexDirection: "column", gap: 8 };
    var issueLinksStyle = { display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: 13, lineHeight: 1.5 };
    var issueLinkStyle = {
      color: "var(--dsw-alias-label-secondary)",
      textDecoration: "underline",
      textUnderlineOffset: 3
    };

    return module.exports;
  },
});
