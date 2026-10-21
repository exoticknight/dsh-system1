import {
  createElement as h,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Modal, modalSelector } from '@deepseek-ai/dsh-client-ui-primitives'
import { createReleaseNoticeReporter } from './release-notes-diagnostics.js'
import { groupReleaseNoticeHighlights } from './release-notes-groups.js'
import {
  acquireReleaseNotesOverlayController,
  onManualReleaseNotesRequest,
  RELEASE_NOTICE,
} from './release-notes.js'
import type { ReleaseNotice, ReleaseNoticeKind } from './release-notes.js'
import { resolveReleaseNoticeLocks } from './release-notes-locks.js'
import type { ReleaseNoticeLocks } from './release-notes-locks.js'
import { presentReleaseNotice } from './release-notes-state.js'
import type { ReleaseNoticeStorage } from './release-notes-state.js'

type ReleaseNoticeCopyKey =
  | 'releaseLanguage'
  | 'releaseMigration'
  | 'releaseTitle'
  | 'releaseAdded'
  | 'releaseImproved'
  | 'releaseFixed'
  | 'releaseClose'
  | 'releaseLink'
  | 'releaseAcknowledge'
type ReleaseNoticeLabel = 'releaseMigration' | 'releaseAdded' | 'releaseImproved' | 'releaseFixed'
type Copy = Translate<ReleaseNoticeCopyKey>
type ReleaseNotesOverlayProps = { t: Copy; log: (message: string) => void }
type ActiveReleaseNotice = {
  notice: ReleaseNotice
  mounted: (value: boolean) => void
}

const RELEASE_NOTICE_SLOT_SETTLE_MS = 500
const RELEASE_NOTICE_MOUNT_TIMEOUT_MS = 10_000

export function ReleaseNotesOverlay({ t, log }: ReleaseNotesOverlayProps) {
  const [active, setActive] = useState<ActiveReleaseNotice | null>(null)
  const activeRef = useRef<ActiveReleaseNotice | null>(null)

  useEffect(() => {
    const releaseController = acquireReleaseNotesOverlayController()
    if (releaseController === undefined) return

    const controller = new AbortController()
    const storage = readNoticeStorage()
    const locks = readNoticeLocks()
    let automaticFinished = false
    let automaticAttempt: Promise<void> | undefined
    let stopAutomaticWatching = () => {}
    const report = createReleaseNoticeReporter(log)

    const present = (automatic: boolean) => presentReleaseNotice({
      noticeId: RELEASE_NOTICE.id,
      automatic,
      ...(storage === undefined ? {} : { storage }),
      ...(locks === undefined ? {} : { locks }),
      signal: controller.signal,
      present: () => {
        if (controller.signal.aborted) return false
        if (automatic && (!hasPresentationSlot() || activeRef.current !== null))
          return 'slot-lost'
        return mountNotice(RELEASE_NOTICE, activeRef, setActive, controller.signal)
      },
    })

    const onManualRequest = () => {
      void present(false).then((result) => report(result, false))
    }
    const scheduleAutomatic = () => {
      if (automaticFinished || automaticAttempt !== undefined || controller.signal.aborted) return
      automaticAttempt = (async () => {
        if (!await waitForPresentationSlot(controller.signal)) return
        const result = await present(true)
        report(result, true)
        automaticFinished = !(result.status === 'skipped' && result.reason === 'slot-lost')
        if (automaticFinished) stopAutomaticWatching()
      })().finally(() => {
        automaticAttempt = undefined
        if (!automaticFinished && !controller.signal.aborted && hasPresentationSlot())
          scheduleAutomatic()
      })
    }
    const observer = new MutationObserver(scheduleAutomatic)
    observePresentationChanges(observer)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleAutomatic()
    }
    stopAutomaticWatching = () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }

    const disposeManualListener = onManualReleaseNotesRequest(onManualRequest)
    document.addEventListener('visibilitychange', onVisibilityChange)
    scheduleAutomatic()

    return () => {
      controller.abort()
      locks?.close?.()
      stopAutomaticWatching()
      disposeManualListener()
      activeRef.current?.mounted(false)
      activeRef.current = null
      releaseController()
    }
  }, [log])

  const close = useCallback(() => {
    activeRef.current = null
    setActive(null)
  }, [])

  return active === null
    ? null
    : h(ReleaseNotesDialog, { active, t, onClose: close })
}

function mountNotice(
  notice: ReleaseNotice,
  activeRef: { current: ActiveReleaseNotice | null },
  setActive: (active: ActiveReleaseNotice | null) => void,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted || activeRef.current !== null) return Promise.resolve(false)
  return new Promise((resolve) => {
    let settled = false
    let timeout = 0
    const finish = (mounted: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      if (!mounted) {
        activeRef.current = null
        setActive(null)
      }
      resolve(mounted)
    }
    const onAbort = () => finish(false)
    timeout = window.setTimeout(() => finish(false), RELEASE_NOTICE_MOUNT_TIMEOUT_MS)
    const next = { notice, mounted: finish }
    activeRef.current = next
    signal.addEventListener('abort', onAbort, { once: true })
    setActive(next)
  })
}

function ReleaseNotesDialog({
  active,
  t,
  onClose,
}: {
  active: ActiveReleaseNotice
  t: Copy
  onClose: () => void
}) {
  useLayoutEffect(() => {
    const dialog = document.querySelector('.dsh-system1-release-notes-modal[role="dialog"][aria-modal="true"]')
    active.mounted(document.visibilityState === 'visible' && dialog !== null)
  }, [active])

  const releaseURL = `https://github.com/exoticknight/dsh-system1/releases/tag/v${encodeURIComponent(active.notice.version)}`
  return h(Modal, {
    open: true,
    onClose,
    title: t('releaseTitle'),
    description: `v${active.notice.version}`,
    closeLabel: t('releaseClose'),
    className: 'dsh-system1-release-notes-modal',
    contentClassName: 'dsh-system1-release-notes-content',
    children: h('div', { style: releaseNoticeBodyStyle },
      h('style', null, releaseNoticeCSS),
      releaseNoticeSections(active.notice, t)),
    footer: h('div', { style: releaseNoticeFooterStyle },
      h(Button, {
        variant: 'ghost',
        size: 'sm',
        onClick: () => window.open(releaseURL, '_blank', 'noopener,noreferrer'),
      }, t('releaseLink')),
      h(Button, {
        variant: 'primary',
        size: 'sm',
        ...{ 'data-modal-autofocus': true },
        onClick: onClose,
      }, t('releaseAcknowledge'))),
  })
}

function releaseNoticeSections(notice: ReleaseNotice, t: Copy) {
  const highlights = notice.highlights[noticeLanguage(t)]
  const labels: Record<ReleaseNoticeKind, ReleaseNoticeLabel> = {
    migration: 'releaseMigration',
    added: 'releaseAdded',
    improved: 'releaseImproved',
    fixed: 'releaseFixed',
  }
  return groupReleaseNoticeHighlights(highlights).map(({ kind, highlights: items }) =>
    h('section', { key: kind, style: releaseNoticeSectionStyle },
      h('h3', { style: releaseNoticeHeadingStyle }, t(labels[kind])),
      h('ul', { style: releaseNoticeListStyle }, items.map((item, index) =>
        h('li', { key: `${kind}-${index}`, style: releaseNoticeItemStyle },
          h('div', { style: releaseNoticeItemTitleStyle }, item.title),
          item.description === undefined
            ? null
            : h('p', { style: releaseNoticeDescriptionStyle }, item.description))))))
}

function noticeLanguage(t: Copy): 'zh' | 'en' {
  return t('releaseLanguage') === 'zh' ? 'zh' : 'en'
}

function readNoticeStorage(): ReleaseNoticeStorage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function readNoticeLocks(): ReleaseNoticeLocks | undefined {
  try {
    if (typeof navigator === 'undefined') return undefined
    const factory = typeof window === 'undefined' ? undefined : window.indexedDB
    return resolveReleaseNoticeLocks(navigator.locks ?? undefined, factory)
  } catch {
    return undefined
  }
}

function hasPresentationSlot(): boolean {
  return document.visibilityState === 'visible' && document.querySelector(modalSelector) === null
}

function waitForPresentationSlot(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)

  return new Promise((resolve) => {
    let observer: MutationObserver
    let settleTimer: number | undefined
    const finish = (value: boolean) => {
      if (settleTimer !== undefined) window.clearTimeout(settleTimer)
      observer.disconnect()
      document.removeEventListener('visibilitychange', check)
      signal.removeEventListener('abort', onAbort)
      resolve(value)
    }
    const check = () => {
      if (signal.aborted) finish(false)
      else if (!hasPresentationSlot()) {
        if (settleTimer !== undefined) {
          window.clearTimeout(settleTimer)
          settleTimer = undefined
        }
      } else if (settleTimer === undefined) {
        settleTimer = window.setTimeout(() => {
          settleTimer = undefined
          finish(hasPresentationSlot())
        }, RELEASE_NOTICE_SLOT_SETTLE_MS)
      }
    }
    const onAbort = () => finish(false)
    observer = new MutationObserver(check)
    observePresentationChanges(observer)
    document.addEventListener('visibilitychange', check)
    signal.addEventListener('abort', onAbort, { once: true })
    check()
  })
}

function observePresentationChanges(observer: MutationObserver): void {
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['role', 'aria-modal'],
  })
}

const releaseNoticeBodyStyle = {
  maxHeight: 'min(420px, calc(100dvh - 260px))',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
}
const releaseNoticeFooterStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
}
const releaseNoticeSectionStyle = { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }
const releaseNoticeHeadingStyle = {
  margin: 0,
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 12,
  lineHeight: '18px',
  fontWeight: 600,
}
const releaseNoticeListStyle = { margin: 0, paddingLeft: 20, color: 'var(--dsw-alias-label-primary)' }
const releaseNoticeItemStyle = { paddingLeft: 2, marginBottom: 12 }
const releaseNoticeItemTitleStyle = { fontSize: 14, lineHeight: '21px', fontWeight: 500 }
const releaseNoticeDescriptionStyle = {
  margin: '4px 0 0',
  color: 'var(--dsw-alias-label-secondary)',
  fontSize: 13,
  lineHeight: '20px',
}
const releaseNoticeCSS = `
.dsh-system1-release-notes-modal {
  width: min(520px, 100%);
  max-height: calc(100dvh - 96px);
}
.dsh-system1-release-notes-content {
  min-height: 0;
}
@media (max-width: 480px) {
  .dsh-system1-release-notes-modal {
    width: 100%;
    max-height: calc(100dvh - 48px);
  }
}
`
