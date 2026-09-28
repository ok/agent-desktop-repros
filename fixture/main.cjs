// A stock Electron app: no accessibility switches or API calls unless FIXTURE_A11Y asks for one.
//   FIXTURE_NAME  window title and page heading (default "Fixture")
//   FIXTURE_X     window x position (default 80)
//   FIXTURE_A11Y  "switch" = --force-renderer-accessibility, "api" = app.setAccessibilitySupportEnabled
const { app, BrowserWindow, Menu } = require('electron')

const name = process.env.FIXTURE_NAME || 'Fixture'
const a11y = process.env.FIXTURE_A11Y || 'none'
if (a11y === 'switch') app.commandLine.appendSwitch('force-renderer-accessibility')

const page = `<!doctype html><title>${name}</title>
<h1 id="h">${name} ready</h1>
<button onclick="document.getElementById('h').textContent='${name} clicked'">Press me</button>
<script>
  document.addEventListener('keydown', (e) => { document.getElementById('h').textContent = '${name} key ' + e.key })
</script>`

app.whenReady().then(() => {
  if (a11y === 'api') app.setAccessibilitySupportEnabled(true)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: name, submenu: [{ role: 'quit' }] },
    {
      label: 'Actions',
      submenu: [{
        label: 'Mark',
        accelerator: 'CmdOrCtrl+K',
        click: () => win.webContents.executeJavaScript(`document.getElementById('h').textContent = '${name} marked'`),
      }],
    },
  ]))
  const win = new BrowserWindow({ x: Number(process.env.FIXTURE_X || 80), y: 80, width: 520, height: 320 })
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page))
})
