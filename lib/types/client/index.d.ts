import type { Context } from '@deepseek-ai/cordis';
declare const en: {
    coreSummary: string;
    provider: string;
    providerTypesafe: string;
    providerLaya: string;
    providerUnknown: string;
    model: string;
    timeout: string;
    defaultHint: string;
    timeoutHint: string;
    providerEnabledHint: string;
    reset: string;
    save: string;
    saving: string;
    saved: string;
    saveFailed: string;
    loading: string;
    unavailable: string;
    readOnly: string;
    required: string;
    invalidTimeout: string;
    key: string;
    keyHint: string;
    layaKeyHint: string;
    keyStatusConfigured: string;
    keyStatusMissing: string;
    keyStatusUnavailable: string;
    keyReadOnly: string;
    keyUnavailable: string;
    keySave: string;
    keyClear: string;
    keySaving: string;
    keySaved: string;
    keyCleared: string;
    keySaveFailed: string;
    keyRequired: string;
    typesafeSummary: string;
    layaSummary: string;
    typesafeEndpoint: string;
    typesafeEndpointHint: string;
    layaEndpoint: string;
    layaEndpointHint: string;
    invalidEndpoint: string;
    modelAuto: string;
    modelEnglish: string;
    modelMultilingual: string;
    modelTypedDecisions: string;
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-system1': keyof typeof en;
    }
}
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export {};
