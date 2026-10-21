export declare const RELEASE_NOTICE_LOCK_NAME = "dsh-system1:release-notes";
export type ReleaseNoticeLocks = Pick<LockManager, 'request'>;
/**
 * Web Locks are the primary coordinator. IndexedDB is the insecure-HTTP
 * fallback: overlapping readwrite transactions serialize acquisition, and
 * the short lease lets another tab recover if its owner disappears.
 */
export declare function createIndexedDbReleaseNoticeLocks(factory: Pick<IDBFactory, 'open'>, databaseName?: string): ReleaseNoticeLocks;
export declare function resolveReleaseNoticeLocks(webLocks: ReleaseNoticeLocks | undefined, factory: Pick<IDBFactory, 'open'> | undefined): ReleaseNoticeLocks | undefined;
