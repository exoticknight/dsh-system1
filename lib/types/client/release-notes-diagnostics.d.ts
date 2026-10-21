import type { ReleaseNoticeAttempt } from './release-notes-state.js';
export declare function createReleaseNoticeReporter(log: (message: string) => void): (result: ReleaseNoticeAttempt, automatic: boolean) => void;
