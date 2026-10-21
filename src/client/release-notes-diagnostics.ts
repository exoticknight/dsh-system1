import type { ReleaseNoticeAttempt } from './release-notes-state.js'

type DiagnosticReason = 'marker-save-failed' | 'storage-unavailable' | 'lock-unavailable' | 'failed'

export function createReleaseNoticeReporter(log: (message: string) => void) {
  const loggedAutomaticReasons = new Set<DiagnosticReason>()

  return (result: ReleaseNoticeAttempt, automatic: boolean): void => {
    if (result.status === 'shown') {
      if (!result.persisted) {
        report(
          'marker-save-failed',
          'The notice was shown, but its display marker could not be saved.',
          automatic,
        )
      }
      return
    }

    if (
      result.reason === 'already-shown' ||
      result.reason === 'slot-lost' ||
      result.reason === 'cancelled'
    )
      return
    if (result.reason === 'storage-unavailable') {
      report(
        'storage-unavailable',
        'Automatic update notice skipped because browser storage is unavailable.',
        automatic,
      )
    } else if (result.reason === 'lock-unavailable') {
      report(
        'lock-unavailable',
        'Automatic update notice skipped because no cross-tab locking API is available.',
        automatic,
      )
    } else {
      report('failed', `Release notice could not be shown: ${String(result.error)}`, automatic)
    }
  }

  function report(reason: DiagnosticReason, message: string, automatic: boolean): void {
    if (automatic && loggedAutomaticReasons.has(reason)) return
    if (automatic) loggedAutomaticReasons.add(reason)
    log(message)
  }
}
