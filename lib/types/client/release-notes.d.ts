export type ReleaseNoticeKind = 'added' | 'improved' | 'fixed';
export type ReleaseNoticeHighlight = {
    kind: ReleaseNoticeKind;
    title: string;
    description?: string;
};
export type ReleaseNotice = {
    id: string;
    version: string;
    highlights: {
        en: ReleaseNoticeHighlight[];
        zh: ReleaseNoticeHighlight[];
    };
};
export declare const RELEASE_NOTICE: ReleaseNotice;
export declare function requestManualReleaseNotes(): void;
export declare function onManualReleaseNotesRequest(listener: () => void): () => void;
