// ---------------------------------------------------------------------------
// The totem shell.
//
// Deliberately thin: it loads THE SAME web build the browser serves and adds
// only what a browser cannot do. If a feature can live in the web app, it does
// — a shell that forks the UI is a second app to keep in sync.
//
// What the browser cannot do, and why each one is here:
//
//   printing   The panel's Masung POS80 is USB. Reaching it means the Win32
//              spooler in RAW mode, which no page can call. See print-raw.ps1
//              for why RAW and not the driver.
//   kiosk      Fullscreen with no chrome, no Alt+Tab, no gesture out. A PWA in
//              "fullscreen" display mode still leaves the OS a way out.
//   identity   The terminal id survives a browser cache the restaurant clears.
// ---------------------------------------------------------------------------

const { app, BrowserWindow, ipcMain, session } = require('electron')
const { execFile } = require('node:child_process')
const { writeFile, unlink, mkdtemp } = require('node:fs/promises')
const { join } = require('node:path')
const { tmpdir } = require('node:os')
const { installExitHatch } = require('./exit-hatch.cjs')
const { serveDist } = require('./serve-dist.cjs')

/**
 * Where the panel points, in the order a real deployment resolves it:
 *
 *   TOTEM_DIST   an explicit bundle on disk — a hand-staged panel
 *   packaged     the app's OWN dist, inside the asar. Electron patches `fs`
 *                to read through the archive, so the static server serves it
 *                like any directory. This is what an installed panel runs,
 *                and it must not need an env var to find itself.
 *   TOTEM_URL    an explicit URL — a dev server, or a hosted build
 *   fallback     the local dev server
 */
const DIST = process.env.TOTEM_DIST ?? (app.isPackaged ? join(app.getAppPath(), 'dist') : undefined)
const TARGET = process.env.TOTEM_URL ?? 'http://localhost:5310'
/** Windows queue name. `Get-Printer` on the panel prints the exact string. */
const PRINTER = process.env.TOTEM_PRINTER ?? 'POS80'
/** Maintenance PIN for the exit hatch. See electron/exit-hatch.cjs. */
const EXIT_PIN = process.env.TOTEM_EXIT_PIN ?? '0000'

const resourceDir = () => (app.isPackaged ? process.resourcesPath : __dirname)
const PS_SCRIPT = join(resourceDir(), 'print-raw.ps1')

/**
 * Kiosk lockdown, applied on launch and LIFTED before quitting.
 *
 * The lift is the important half. Locked down, the taskbar is hidden and the
 * edge gesture that summons it is off by policy — so an app that simply exits
 * hands whoever typed the PIN a black screen with no touch-reachable way to
 * anything. Every exit path goes through `quitCleanly` for this reason.
 */
function lockdown(undo) {
  if (process.platform !== 'win32') return Promise.resolve()
  return new Promise((resolve) => {
    execFile('powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(resourceDir(), 'lockdown.ps1'),
       ...(undo ? ['-Undo'] : [])],
      { timeout: 25_000, windowsHide: true },
      () => resolve())
  })
}

let quitting = false
async function quitCleanly() {
  if (quitting) return
  quitting = true
  await lockdown(true)
  app.exit(0)
}

/**
 * Bytes to paper.
 *
 * Via a temp file and PowerShell rather than a native addon: the P/Invoke is
 * forty lines that already ran against this exact printer, and a native module
 * would have to be rebuilt for every Electron version on a machine that has no
 * build toolchain. ~200ms of overhead a receipt, which nobody waiting for a
 * ticket can perceive.
 */
async function printRaw(bytes) {
  if (process.platform !== 'win32') {
    return { ok: false, message: 'Impressão RAW só existe no painel Windows.' }
  }
  const dir = await mkdtemp(join(tmpdir(), 'fayz-print-'))
  const file = join(dir, 'job.bin')
  await writeFile(file, Buffer.from(bytes))
  try {
    const out = await new Promise((resolve, reject) => {
      execFile(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT, '-Printer', PRINTER, '-File', file],
        { timeout: 20_000, windowsHide: true },
        (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(String(stdout).trim())),
      )
    })
    // The script answers "OK <bytes>" or "ERR <what failed> <win32 code>". The
    // operator sees the second half, so it has to read as a sentence.
    if (!out.startsWith('OK')) return { ok: false, message: `Impressora recusou: ${out}` }
    return { ok: true }
  } catch (cause) {
    return { ok: false, message: `Impressora não respondeu: ${cause.message}` }
  } finally {
    await unlink(file).catch(() => {})
  }
}

ipcMain.handle('fayz:print-raw', (_event, bytes) => printRaw(bytes))
ipcMain.handle('fayz:printer-name', () => PRINTER)

// Checked again here, not only in the overlay: the renderer's copy of the PIN
// is reachable from devtools, so the process that actually quits verifies it.
ipcMain.handle('fayz:request-exit', (_event, pin) => {
  if (pin !== EXIT_PIN) return { ok: false }
  void quitCleanly()
  return { ok: true }
})

function createWindow() {
  const win = new BrowserWindow({
    kiosk: true,
    fullscreen: true,
    autoHideMenuBar: true,
    // Above the taskbar, not merely maximised. Windows 11 raises the taskbar on
    // a swipe from the bottom edge even over a fullscreen window; at the
    // screen-saver level the panel stays on top of it. The edge GESTURE itself
    // is an OS policy, not something a window can refuse — see lockdown.ps1.
    alwaysOnTop: true,
    backgroundColor: '#0B0B0C',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // A kiosk with a context menu is a kiosk a customer wanders out of. Staff
  // leave by the exit hatch below, which is deliberate and PIN-gated.
  win.webContents.on('context-menu', (e) => e.preventDefault())
  win.setAlwaysOnTop(true, 'screen-saver')
  // A customer who manages to surface something else does not get to keep it:
  // losing focus pulls the panel straight back to the front.
  win.on('blur', () => {
    if (!win.isDestroyed()) win.setAlwaysOnTop(true, 'screen-saver')
  })
  installExitHatch(win, { pin: EXIT_PIN, onExit: () => void quitCleanly() })
  return win
}

async function targetOrigin() {
  if (!DIST) return TARGET
  try {
    return await serveDist(DIST)
  } catch (cause) {
    // Falling through to TOTEM_URL rather than showing a blank kiosk: a panel
    // that cannot serve its own bundle can still reach a hosted one.
    console.error('[fayz] bundle local não pôde ser servido:', cause.message)
    return TARGET
  }
}

// The waiter's microphone: in a browser this is a permission prompt nobody is
// standing there to accept. On a panel that WE deploy, the answer is yes.
function grantPanelPermissions() {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })
}

/**
 * Drop the PWA's own cache before loading.
 *
 * The web build registers a service worker, which is right in a browser and
 * wrong here: the shell already ships the bundle and already decides when it
 * changes. Two update mechanisms stacked means replacing dist/ on disk and
 * still getting the previous build on screen — which is exactly what happened
 * on this panel, and reads to whoever is standing there as "the update didn't
 * install".
 *
 * Only the caches. Sessions, localStorage and the device login survive, so a
 * relaunch does not make the panel sign in again.
 */
async function dropStaleAppCache() {
  try {
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
  } catch (cause) {
    console.warn('[fayz] cache do app não pôde ser limpo:', cause.message)
  }
}

app.whenReady().then(async () => {
  if (EXIT_PIN === '0000') {
    // Loud on purpose: a fleet of panels sharing the default PIN is a fleet
    // anyone can walk out of.
    console.warn('[fayz] TOTEM_EXIT_PIN não configurado — usando 0000. Defina antes de instalar em loja.')
  }
  grantPanelPermissions()
  await lockdown(false)
  await dropStaleAppCache()
  const origin = await targetOrigin()
  createWindow().loadURL(origin)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow().loadURL(origin)
  })
})

// Not `app.quit()`: a window closed by any route — the hatch, a crash, an OS
// signal — still has to give the machine back.
app.on('window-all-closed', () => void quitCleanly())
app.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  void quitCleanly()
})
