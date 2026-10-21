import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const kinds = new Set(['added', 'improved', 'fixed'])

export function readCurrentReleaseNotice(root = process.cwd()) {
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const catalog = JSON.parse(readFileSync(resolve(root, 'src/client/release-notes.json'), 'utf8'))
  const notice = catalog[packageJson.version]

  if (!notice || typeof notice !== 'object' || Array.isArray(notice))
    throw new Error(`Missing release-notes entry for package version ${packageJson.version}.`)
  if (notice.version !== packageJson.version)
    throw new Error(`Release-notes version must equal package.json version ${packageJson.version}.`)
  if (typeof notice.id !== 'string' || notice.id.trim() === '')
    throw new Error(`Release-notes entry ${packageJson.version} needs a non-empty id.`)

  for (const locale of ['zh', 'en']) {
    const highlights = notice.highlights?.[locale]
    if (!Array.isArray(highlights) || highlights.length === 0)
      throw new Error(`Release-notes entry ${packageJson.version} needs non-empty ${locale} highlights.`)
    for (const [index, highlight] of highlights.entries()) {
      if (!highlight || typeof highlight !== 'object' || !kinds.has(highlight.kind))
        throw new Error(`Release-notes ${locale} highlight ${index + 1} needs a valid kind.`)
      if (typeof highlight.title !== 'string' || highlight.title.trim() === '')
        throw new Error(`Release-notes ${locale} highlight ${index + 1} needs a non-empty title.`)
      if (highlight.description !== undefined &&
        (typeof highlight.description !== 'string' || highlight.description.trim() === ''))
        throw new Error(`Release-notes ${locale} highlight ${index + 1} has an empty description.`)
    }
  }

  return notice
}
