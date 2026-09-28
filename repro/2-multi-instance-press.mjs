// Issue 2: `press` selects its target by app name only, so with two instances of one app (two
// Electron dev builds, two browser profiles) it cannot be aimed at either of them.
import { ad, header, show, launchFixture, stopFixtures, flatText, verdict } from './lib.mjs'

header('press cannot target one of two instances of the same app')
const a = await launchFixture({ name: 'Alpha', x: 80, a11y: 'api' })
const b = await launchFixture({ name: 'Beta', x: 640, a11y: 'api' })
const heading = (w) => flatText(ad('snapshot', '--app', 'Electron', '--window-id', w.windowId).data?.tree)

try {
  console.log(`two instances: Alpha pid ${a.pid} ${a.windowId}, Beta pid ${b.pid} ${b.windowId}\n`)
  show('press --app Electron cmd+k', ad('press', '--app', 'Electron', 'cmd+k'))

  const aimed = ad('press', '--window-id', b.windowId, 'cmd+k')
  show(`press --window-id ${b.windowId} cmd+k`, aimed)
  const betaMarked = heading(b).includes('Beta marked')
  const alphaUntouched = !heading(a).includes('Alpha marked')
  console.log(`  Beta received the shortcut: ${betaMarked}; Alpha untouched: ${alphaUntouched}`)

  const scoped = ad('press', '--app', 'Electron', '--window-id', a.windowId, 'cmd+k')
  show(`press --app Electron --window-id ${a.windowId} cmd+k`, scoped)
  const alphaMarked = heading(a).includes('Alpha marked')
  console.log(`  Alpha received the shortcut: ${alphaMarked}`)

  verdict(!(aimed.ok && betaMarked && alphaUntouched && scoped.ok && alphaMarked),
    'press reaches exactly the instance whose window was named')
} finally {
  stopFixtures()
}
