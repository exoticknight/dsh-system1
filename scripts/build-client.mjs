import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { build } from 'esbuild'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const output = resolve(root, 'lib/client.js')
const result = await build({
  entryPoints: [resolve(root, 'src/client/index.ts')],
  outfile: resolve(root, '.client-build/client.cjs'),
  bundle: true,
  packages: 'external',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  write: false,
  legalComments: 'none',
})
const entry = result.outputFiles[0]?.text
if (!entry) throw new Error('esbuild did not emit the client entry.')

// DSH 1.7 expects a lazy CommonJS factory in ModuleLoader. Its clientBundle
// build preset is not published, so esbuild handles TypeScript and package
// resolution while this wrapper supplies DSH's small runtime format boundary.
const bundle = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
${entry
  .split('\n')
  .map((line) => `    ${line}`.trimEnd())
  .join('\n')}
    return module.exports;
  },
});
`

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, bundle)
