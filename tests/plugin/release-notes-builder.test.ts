import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'

const { readCurrentReleaseNotice } = await import(
  pathToFileURL(resolve('scripts/release-notes.mjs')).href,
)

test('release notice validation allows five and rejects six highlights per locale', () => {
  const validRoot = createReleaseRoot({ zh: createHighlights(5), en: createHighlights(5) })
  try {
    assert.equal(readCurrentReleaseNotice(validRoot).version, '1.2.3')
  } finally {
    rmSync(validRoot, { recursive: true, force: true })
  }

  for (const locale of ['zh', 'en'] as const) {
    const highlights = { zh: createHighlights(1), en: createHighlights(1) }
    highlights[locale] = createHighlights(6)
    const invalidRoot = createReleaseRoot(highlights)
    try {
      assert.throws(
        () => readCurrentReleaseNotice(invalidRoot),
        new RegExp(`at most 5 ${locale} highlights`),
      )
    } finally {
      rmSync(invalidRoot, { recursive: true, force: true })
    }
  }
})

function createReleaseRoot(highlights: Record<'zh' | 'en', Array<{ kind: string; title: string }>>): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-release-notes-'))
  mkdirSync(join(root, 'src', 'client'), { recursive: true })
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }))
  writeFileSync(join(root, 'src', 'client', 'release-notes.json'), JSON.stringify({
    '1.2.3': { id: '1.2.3', version: '1.2.3', highlights },
  }))
  return root
}

function createHighlights(count: number) {
  return Array.from({ length: count }, (_, index) => ({ kind: 'added', title: `Change ${index + 1}` }))
}
