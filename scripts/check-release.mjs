import { readFileSync } from 'node:fs'
import { readCurrentReleaseNotice } from './release-notes.mjs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME
if (!tag || tag !== `v${version}`) {
  throw new Error(
    `Release tag must equal v${version}; received ${tag ?? '(missing)'}.`,
  )
}
readCurrentReleaseNotice()
console.log(`Release version verified: ${tag}`)
