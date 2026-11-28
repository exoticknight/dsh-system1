export declare const CHINESE_DECISION_DEFAULT_BASE_URL = "http://127.0.0.1:8787";
export declare const CHINESE_DECISION_DEFAULT_TIMEOUT_MS = 10000;
export declare const CHINESE_DECISION_MODELS: readonly [{
    readonly id: 'chinese-decision-0.8b';
}];
export interface ChineseDecisionOptions {
    baseURL?: string | undefined;
    timeoutMs?: number | undefined;
    fetch?: typeof fetch;
}
export declare function createChineseDecisionProvider(options?: ChineseDecisionOptions): import("../../contracts/provider.js").DecideImplementation & import("../decision-implementation.js").DecisionTransport;
//# sourceMappingURL=adapter.d.ts.map