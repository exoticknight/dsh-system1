import type { InvocationDescriptor, TypertRemoteContribution, RemoteStreamHandle } from '@deepseek-ai/dsh-typert-protocol';
import type { OperationCatalog } from './contracts/operation.js';
export interface ProviderComponentBinding {
    readonly rowId: string;
    readonly moduleName: string;
    readonly providerId: string;
    /** Reference name only, never the credential value. */
    readonly keyRef: string;
}
export interface SettingsCatalog extends OperationCatalog {
    readonly providerComponents?: readonly ProviderComponentBinding[];
}
export declare const SETTINGS_SERVICE: 'system1Settings';
export declare const settingsRemote: TypertRemoteContribution;
export declare const settingsHost: {
    package: string;
    face: 'host';
    schemas: never[];
    model: {
        services: never[];
        events: never[];
        objects: never[];
    };
    invocations: readonly InvocationDescriptor[];
};
export declare function projectCatalog(value: unknown): SettingsCatalog;
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespaceMap {
        system1Settings: {
            watch(signal?: AbortSignal): RemoteStreamHandle<SettingsCatalog, never>;
        };
    }
}
