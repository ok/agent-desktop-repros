// Issue 3: agent-desktop 0.9 cannot snapshot a stock Electron app. It sets AXManualAccessibility,
// reads it back, and Electron answers false — although the page's accessibility tree is live.
import { ad, header, show, launchFixture, stopFixtures, flatText, verdict } from './lib.mjs'

header('stock Electron: snapshot fails on the AXManualAccessibility read-back')
const results = {}

for (const a11y of ['none', 'switch', 'api']) {
  const fixture = await launchFixture({ name: `Fixture-${a11y}`, a11y })
  try {
    const res = ad('snapshot', '--app', 'Electron', '--window-id', fixture.windowId, '-i')
    const seesPage = res.ok && flatText(res.data.tree).includes('Press me')
    show(`snapshot (app enables accessibility via: ${a11y})`, res)
    console.log(`  page content visible: ${seesPage}\n`)
    results[a11y] = seesPage
  } finally {
    stopFixtures()
  }
}

console.log('none   = stock app, nothing enabled (what every shipped Electron app looks like)')
console.log('switch = --force-renderer-accessibility')
console.log('api    = app.setAccessibilitySupportEnabled(true) (the only mode Electron reports as enabled)')
verdict(!(results.none && results.switch && results.api), 'every mode yields the page content')
