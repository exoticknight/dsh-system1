// Prepares and runs a local model service for one probe target. Nothing is
// installed or downloaded until that target is probed, and a service this
// script starts is stopped when the probe finishes.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = resolve('.scratch/local-providers')
const isWindows = process.platform === 'win32'

export const CLEF_REVISION = '17f0b0ad64efb65d273590632833508766b2aae6'

export const services = {
  laya: {
    dir: join(root, 'laya'),
    venv: '.venv',
    install: [
      ['-m', 'pip', 'install', 'torch==2.14.1+cpu', '--index-url', 'https://download.pytorch.org/whl/cpu'],
      ['-m', 'pip', 'install', 'laya[serve]==0.3.27'],
    ],
    // The official service downloads its checkpoint during preload.
    start: (python, port) => ({
      command: python,
      args: ['-c', 'from laya.serve import main; main()'],
      env: {
        LAYA_HOST: '127.0.0.1',
        LAYA_PORT: String(port),
        LAYA_DEVICE: process.env.LAYA_DEVICE || 'cpu',
        LAYA_MODELS: 'multilingual',
        LAYA_PRELOAD: '1',
        LAYA_DEFAULT_MODEL: 'multilingual',
        LAYA_MAX_LOADED: '1',
      },
    }),
    ready: (health) => health.status === 'ok' && health.loaded?.includes('multilingual'),
    startupMs: 30 * 60_000,
  },

  'clef-local': {
    dir: join(root, 'cloudflare'),
    venv: 'venv',
    install: [['-m', 'pip', 'install', '-r', resolve('tests/providers/clef-local/requirements.txt')]],
    model: join(root, 'cloudflare', 'model'),
    download: downloadClef,
    start: (python, port, model) => ({
      command: python,
      args: [
        resolve('tests/providers/clef-local/serve.py'),
        '--model-path', model,
        '--device', process.env.CLEF_DEVICE || 'cpu',
        '--port', String(port),
      ],
      env: {},
    }),
    ready: (health) => health.status === 'ok' && health.loaded === true,
    startupMs: 15 * 60_000,
  },
}

/**
 * Returns a stop function. Reuses a service that already answers /health;
 * otherwise prepares the environment and model, then starts the service.
 */
export async function ensureService(name, endpoint) {
  const service = services[name]
  const url = new URL(endpoint)
  if (await readHealth(endpoint)) {
    await waitReady(name, endpoint, service)
    return async () => {}
  }
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')
    throw new Error(`${endpoint} is not reachable and is not a local service this probe can start.`)

  const python = ensureVenv(name, service)
  if (service.download && !existsSync(join(service.model, '.git'))) {
    log(name, `model not found at ${service.model}; downloading now`)
    service.download(service.model)
  }
  const { command, args, env } = service.start(python, Number(url.port), service.model)
  const logFile = join(service.dir, 'serve.log')
  log(name, `starting service on ${url.origin} (log: ${logFile})`)
  const out = openSync(logFile, 'a')
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', out, out],
    windowsHide: true,
    detached: !isWindows,
  })
  const stop = async () => {
    if (child.exitCode !== null) return
    if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(-child.pid, 'SIGTERM')
  }
  try {
    await waitReady(name, endpoint, service, child)
  } catch (error) {
    await stop()
    throw error
  }
  return stop
}

function ensureVenv(name, service) {
  const venv = join(service.dir, service.venv)
  const python = isWindows ? join(venv, 'Scripts', 'python.exe') : join(venv, 'bin', 'python')
  if (existsSync(python)) return python
  log(name, `creating Python environment at ${venv}`)
  mkdirSync(service.dir, { recursive: true })
  exec(process.env.PYTHON || (isWindows ? 'python' : 'python3'), ['-m', 'venv', venv])
  for (const args of service.install) exec(python, ['-I', ...args])
  return python
}

function downloadClef(dir) {
  exec('git', ['lfs', 'version'], 'Git LFS is required to download Clef weights.')
  mkdirSync(dirname(dir), { recursive: true })
  const git = (...args) => exec('git', ['-C', dir, ...args])
  exec('git', ['clone', '--no-checkout', 'https://huggingface.co/Cloudflare/clef-flash', dir], undefined, {
    GIT_LFS_SKIP_SMUDGE: '1',
  })
  git('lfs', 'install', '--local')
  git('fetch', '--depth=1', 'origin', CLEF_REVISION)
  exec('git', ['-C', dir, 'checkout', '--detach', CLEF_REVISION], undefined, { GIT_LFS_SKIP_SMUDGE: '1' })
  git('-c', 'lfs.concurrenttransfers=4', '-c', 'lfs.transfer.maxretries=12',
    '-c', 'lfs.basictransfersonly=true', 'lfs', 'fetch', 'origin', CLEF_REVISION)
  git('lfs', 'checkout')
  git('lfs', 'fsck')
}

async function waitReady(name, endpoint, service, child) {
  const deadline = Date.now() + service.startupMs
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null)
      throw new Error(`${name} service exited with code ${child.exitCode}; see ${join(service.dir, 'serve.log')}.`)
    const health = await readHealth(endpoint)
    if (health && service.ready(health)) return
    await new Promise((done) => setTimeout(done, 3000))
  }
  throw new Error(`${name} service did not become ready in time; see serve.log.`)
}

async function readHealth(endpoint) {
  try {
    const response = await fetch(`${endpoint.replace(/\/+$/u, '')}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    return response.ok ? await response.json() : undefined
  } catch {
    return undefined
  }
}

function exec(command, args, failure, env = {}) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, ...env },
  })
  if (result.status !== 0)
    throw new Error(failure ?? `${command} ${args[0]} failed with exit code ${result.status}.`)
}

function log(name, message) {
  console.error(`[${name}] ${message}`)
}
