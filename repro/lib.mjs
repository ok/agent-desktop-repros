import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const AD = process.env.AD || 'agent-desktop'
const FIXTURE = path.resolve(import.meta.dirname, '../fixture')
const ELECTRON = path.join(FIXTURE, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Run agent-desktop and return its JSON envelope plus the wall time; never throws.
export function ad(...args) {
  const started = Date.now()
  let out
  try {
    out = execFileSync(AD, args, { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) {
    out = e.stdout
  }
  const ms = Date.now() - started
  try {
    return { ...JSON.parse(out), ms }
  } catch {
    return { ok: false, error: { code: 'NON_JSON', message: String(out).slice(0, 200) }, ms }
  }
}

export function header(title) {
  const version = ad('version').data?.version ?? '?'
  console.log(`# ${title}`)
  console.log(`agent-desktop: ${AD} (${version}), macOS ${execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim()}\n`)
}

export function show(label, res) {
  const outcome = res.ok ? 'ok' : `${res.error?.code}: ${res.error?.message}`
  console.log(`$ agent-desktop ${label}\n  -> ${outcome}  (${res.ms} ms)`)
}

// System Events relaunches on demand and answers -600 ("isn't running") while it does; retry once.
export function osa(...lines) {
  const run = () => execFileSync('osascript', lines.flatMap((l) => ['-e', l]), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  try {
    return run()
  } catch (e) {
    if (!String(e.stderr).includes('(-600)')) throw e
    execFileSync('sleep', ['1'])
    return run()
  }
}

export const frontmostApp = () => osa('tell application "System Events" to get name of first process whose frontmost is true')

const launched = []

// Launch the fixture and wait for its window. Scoped listing, so this works on every build.
export async function launchFixture({ name, x = 80, a11y = 'none' }) {
  const before = new Set(electronWindows().map((w) => w.id))
  const userData = mkdtempSync(path.join(os.tmpdir(), 'ad-fixture-'))
  const proc = spawn(ELECTRON, [FIXTURE, `--user-data-dir=${userData}`], {
    env: { ...process.env, FIXTURE_NAME: name, FIXTURE_X: String(x), FIXTURE_A11Y: a11y },
    stdio: 'ignore',
  })
  launched.push(proc)
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    const fresh = electronWindows().find((w) => !before.has(w.id) && w.visible && w.pid === proc.pid)
    if (fresh) {
      await sleep(1500)
      return { name, pid: proc.pid, windowId: fresh.id }
    }
    await sleep(200)
  }
  throw new Error(`fixture ${name} never showed a window`)
}

export function electronWindows() {
  const res = ad('list-windows', '--app', 'Electron')
  return res.ok ? res.data : []
}

export function stopFixtures() {
  for (const p of launched) {
    try { p.kill('SIGKILL') } catch {}
  }
}

export function flatText(tree) {
  const out = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    for (const k of ['name', 'value', 'description']) if (typeof n[k] === 'string') out.push(n[k])
    for (const c of n.children ?? []) walk(c)
  }
  walk(tree)
  return out.join(' | ')
}

export function verdict(reproduced, expectation) {
  console.log(`\n${reproduced ? 'RESULT: BUG REPRODUCED' : 'RESULT: NOT REPRODUCED (behaves as expected)'} — ${expectation}`)
  process.exitCode = reproduced ? 1 : 0
}
