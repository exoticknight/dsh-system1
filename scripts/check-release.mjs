import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME
if (!tag || tag !== `v${version}`) {
  throw new Error(
    `Release tag must equal v${version}; received ${tag ?? '(missing)'}.`,
  )
}
console.log(`Release version verified: ${tag}`)
