// Issue 1: while Finder's desktop is the focused element, every command that builds the global
// window inventory times out, although no application is busy.
import { ad, header, show, osa, frontmostApp, launchFixture, stopFixtures, sleep, verdict } from './lib.mjs'

header('Finder desktop focused -> global window inventory times out')
const restore = frontmostApp()
const fixture = await launchFixture({ name: 'Fixture', a11y: 'api' })
const shot = `/tmp/ad-repro-1-${process.pid}.png`

try {
  osa('tell application "Finder" to activate', 'delay 0.5',
    'tell application "System Events" to tell process "Finder" to set value of attribute "AXFocused" of group 1 of scroll area 1 to true')
  await sleep(500)
  const focusedRole = osa('tell application "System Events" to tell process "Finder" to get role of (value of attribute "AXFocusedWindow")')
  console.log(`precondition: Finder frontmost=${frontmostApp() === 'Finder'}, Finder AXFocusedWindow role=${focusedRole}\n`)
  if (focusedRole !== 'AXScrollArea') throw new Error('precondition not met: Finder desktop is not the focused element')

  const listed = ad('list-windows')
  show('list-windows', listed)
  const snapped = ad('snapshot', '--window-id', fixture.windowId, '-i')
  show(`snapshot --window-id ${fixture.windowId} -i`, snapped)
  const captured = ad('screenshot', shot, '--window-id', fixture.windowId)
  show(`screenshot ${shot} --window-id ${fixture.windowId}`, captured)

  verdict(!(listed.ok && snapped.ok && captured.ok), 'all three commands succeed while the desktop is focused')
} finally {
  stopFixtures()
  osa(`tell application "${restore}" to activate`)
}
