import type { Translate } from '@deepseek-ai/dsh-client-ui-slots';
import type { ReleaseNotice } from './release-notes.js';
type ReleaseNoticeCopyKey = 'releaseLanguage' | 'releaseMigration' | 'releaseTitle' | 'releaseAdded' | 'releaseImproved' | 'releaseFixed' | 'releaseClose' | 'releaseLink' | 'releaseAcknowledge';
type Copy = Translate<ReleaseNoticeCopyKey>;
type ReleaseNotesOverlayProps = {
    t: Copy;
    log: (message: string) => void;
};
type ActiveReleaseNotice = {
    notice: ReleaseNotice;
    mounted: (value: boolean) => void;
};
export declare function ReleaseNotesOverlay({ t, log }: ReleaseNotesOverlayProps): import("react").FunctionComponentElement<{
    active: ActiveReleaseNotice;
    t: Copy;
    onClose: () => void;
}> | null;
export {};
