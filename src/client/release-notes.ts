export type ReleaseNoticeKind = 'migration' | 'added' | 'improved' | 'fixed'

export type ReleaseNoticeHighlight = {
  kind: ReleaseNoticeKind
  title: string
  description?: string
}

export type ReleaseNotice = {
  id: string
  version: string
  highlights: {
    en: ReleaseNoticeHighlight[]
    zh: ReleaseNoticeHighlight[]
  }
}

declare const __DSH_SYSTEM1_RELEASE_NOTICE_JSON__: string

export const RELEASE_NOTICE = JSON.parse(
  __DSH_SYSTEM1_RELEASE_NOTICE_JSON__,
) as ReleaseNotice

const manualRequestListeners = new Set<() => void>()

export function requestManualReleaseNotes(): void {
  for (const listener of manualRequestListeners) listener()
}

export function onManualReleaseNotesRequest(listener: () => void): () => void {
  manualRequestListeners.add(listener)
  return () => manualRequestListeners.delete(listener)
}
