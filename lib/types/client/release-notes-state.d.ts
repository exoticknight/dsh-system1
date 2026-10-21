import type { ReleaseNoticeLocks } from './release-notes-locks.js';
export declare const RELEASE_NOTICE_STORAGE_KEY = "dsh-system1:release-notes:lastShownNoticeId";
export { RELEASE_NOTICE_LOCK_NAME } from './release-notes-locks.js';
export type { ReleaseNoticeLocks } from './release-notes-locks.js';
export type ReleaseNoticeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type ReleaseNoticeAttempt = {
    status: 'shown';
    persisted: boolean;
} | {
    status: 'skipped';
    reason: 'already-shown' | 'storage-unavailable' | 'lock-unavailable' | 'cancelled' | 'failed';
    error?: unknown;
};
type PresentReleaseNoticeOptions = {
    noticeId: string;
    automatic: boolean;
    storage?: ReleaseNoticeStorage;
    locks?: ReleaseNoticeLocks;
    signal?: AbortSignal;
    present: () => boolean | Promise<boolean>;
};
/** Serialize every automatic and manual presentation across tabs of the same origin. */
export declare function presentReleaseNotice({ noticeId, automatic, storage, locks, signal, present, }: PresentReleaseNoticeOptions): Promise<ReleaseNoticeAttempt>;
