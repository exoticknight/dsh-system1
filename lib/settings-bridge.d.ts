import type { Context } from '@deepseek-ai/cordis';
import type { OperationCatalog } from './contracts/operation.js';
import { settingsHost } from './settings-wire.js';
interface Directory {
    getCatalog(): OperationCatalog;
    subscribeCatalog(listener: () => void): () => void;
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRegistryContract {
        register(contribution: typeof settingsHost): () => void | Promise<void>;
    }
}
export declare function installSettingsBridge(ctx: Context, directory: Directory): void;
export {};
//# sourceMappingURL=settings-bridge.d.ts.map