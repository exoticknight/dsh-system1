export type ReleaseNoticeKind = 'added' | 'improved' | 'fixed'

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
let manualRequestPending = false

export function requestManualReleaseNotes(): void {
  if (manualRequestListeners.size === 0) {
    manualRequestPending = true
    return
  }
  for (const listener of manualRequestListeners) listener()
}

export function onManualReleaseNotesRequest(listener: () => void): () => void {
  manualRequestListeners.add(listener)
  if (manualRequestPending) {
    manualRequestPending = false
    listener()
  }
  return () => manualRequestListeners.delete(listener)
}
