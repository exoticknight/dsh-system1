import type { ReleaseNoticeHighlight, ReleaseNoticeKind } from './release-notes.js';
export type ReleaseNoticeHighlightGroup = {
    kind: ReleaseNoticeKind;
    highlights: ReleaseNoticeHighlight[];
};
export declare function groupReleaseNoticeHighlights(highlights: readonly ReleaseNoticeHighlight[]): ReleaseNoticeHighlightGroup[];
