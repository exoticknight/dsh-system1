import { spawnSync } from 'node:child_process'

const buildInputs = [
  'src',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.build.json',
]

const unstagedInputs = spawnSync(
  'git',
  ['diff', '--quiet', '--', ...buildInputs],
  { stdio: 'ignore' },
)
if (unstagedInputs.error || unstagedInputs.status > 1) {
  console.error('Could not check staged build inputs.')
  process.exit(1)
}
if (unstagedInputs.status === 1) {
  console.error(
    'Stage or stash build-input changes before committing so lib matches the commit.',
  )
  process.exit(1)
}

const untrackedSources = spawnSync(
  'git',
  ['ls-files', '--others', '--exclude-standard', '--', 'src'],
  { encoding: 'utf8' },
)
if (untrackedSources.error || untrackedSources.status !== 0) {
  console.error('Could not check for untracked source files.')
  process.exit(1)
}
if (untrackedSources.stdout.trim()) {
  console.error(
    'Stage new source files before committing so lib matches the commit.',
  )
  process.exit(1)
}

const build =
  process.platform === 'win32'
    ? spawnSync('pnpm.cmd build', { stdio: 'inherit', shell: true })
    : spawnSync('pnpm', ['build'], { stdio: 'inherit' })
if (build.error || build.status !== 0) process.exit(build.status ?? 1)

const stage = spawnSync('git', ['add', '--', 'lib'], { stdio: 'inherit' })
if (stage.error || stage.status !== 0) process.exit(stage.status ?? 1)
