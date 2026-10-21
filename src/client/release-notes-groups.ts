import type { ReleaseNoticeHighlight, ReleaseNoticeKind } from './release-notes.js'

export type ReleaseNoticeHighlightGroup = {
  kind: ReleaseNoticeKind
  highlights: ReleaseNoticeHighlight[]
}

const RELEASE_NOTICE_KIND_ORDER: readonly ReleaseNoticeKind[] = [
  'migration',
  'added',
  'improved',
  'fixed',
]

export function groupReleaseNoticeHighlights(
  highlights: readonly ReleaseNoticeHighlight[],
): ReleaseNoticeHighlightGroup[] {
  return RELEASE_NOTICE_KIND_ORDER.flatMap((kind) => {
    const items = highlights.filter((highlight) => highlight.kind === kind)
    return items.length === 0 ? [] : [{ kind, highlights: items }]
  })
}
