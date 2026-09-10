// ---------------------------------------------------------------------------
// The way out.
//
// A kiosk with no exit is a kiosk that needs a screwdriver, and the person who
// needs out is usually a manager on a Saturday, not an engineer with SSH. So
// there are three ways, in the order they will actually be used:
//
//   1. Corner taps + PIN   touch only, no keyboard, no visible affordance
//   2. Ctrl+Alt+Shift+Q    for whoever plugs a keyboard in
//   3. SSH / Tailscale     already on this panel, and the one that works when
//                          the app itself is wedged
//
// What this is NOT: a security boundary. Electron's `kiosk` does not block
// Ctrl+Alt+Del, Task Manager, or a hard power cycle. It stops a CUSTOMER from
// wandering out of the app — a determined person with the machine in front of
// them is a job for Windows Assigned Access, which is a separate decision.
// ---------------------------------------------------------------------------

/** Taps in the corner, and how fast, before the PIN pad appears. */
const TAPS = 5
const WINDOW_MS = 3000
const CORNER_PX = 80

/** Injected into the page rather than shipped in the web app: the escape hatch
 *  belongs to the shell, and the browser build must not grow a quit button.
 *
 *  The keypad is drawn, not an <input>. A totem has no keyboard, and Windows
 *  does not raise its on-screen one for a focused field inside Electron — so a
 *  text input here is a PIN prompt nobody standing at the panel can answer. */
function overlayScript(pin) {
  return `(() => {
    if (window.__fayzExitHatch) return
    window.__fayzExitHatch = true
    let taps = [], pad = null

    const close = () => { pad?.remove(); pad = null }

    const open = () => {
      if (pad) return
      let entry = ''
      pad = document.createElement('div')
      pad.setAttribute('data-fayz-exit', '')
      pad.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;' +
        'align-items:center;justify-content:center;background:rgba(0,0,0,.88);' +
        'font:16px system-ui,sans-serif;color:#fff;-webkit-user-select:none;user-select:none'

      const box = document.createElement('div')
      box.style.cssText = 'background:#141416;padding:26px;border-radius:18px;width:300px;text-align:center'

      const title = document.createElement('div')
      title.textContent = 'PIN de manutenção'
      title.style.cssText = 'opacity:.65;margin-bottom:14px'

      const dots = document.createElement('div')
      dots.style.cssText = 'font-size:30px;letter-spacing:.35em;height:38px;color:#fff'

      const msg = document.createElement('div')
      msg.style.cssText = 'min-height:18px;font-size:13px;color:#ff6b6b;margin-bottom:8px'

      const paint = () => { dots.textContent = '•'.repeat(entry.length) || '\u00A0' }

      const grid = document.createElement('div')
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px'

      const key = (label, onTap, bg) => {
        const b = document.createElement('button')
        b.textContent = label
        b.style.cssText = 'padding:18px 0;font-size:22px;border:0;border-radius:12px;' +
          'background:' + (bg || '#232327') + ';color:#fff;touch-action:manipulation'
        b.onclick = onTap
        return b
      }

      const submit = () => {
        if (entry === ${JSON.stringify(pin)}) window.fayzShell?.requestExit(entry)
        else { msg.textContent = 'PIN incorreto'; entry = ''; paint() }
      }
      const digit = (d) => () => {
        if (entry.length >= 8) return
        entry += d; msg.textContent = ''; paint()
      }

      for (const d of ['1','2','3','4','5','6','7','8','9']) grid.append(key(d, digit(d)))
      grid.append(key('⌫', () => { entry = entry.slice(0, -1); paint() }))
      grid.append(key('0', digit('0')))
      grid.append(key('OK', submit, '#c2410c'))

      const back = document.createElement('button')
      back.textContent = 'Voltar ao atendimento'
      back.style.cssText = 'margin-top:14px;width:100%;padding:14px;border:0;border-radius:12px;' +
        'background:#2a2a2e;color:#fff;font-size:15px'
      back.onclick = close

      paint()
      box.append(title, dots, msg, grid, back)
      pad.append(box)
      document.body.append(pad)
      // Walking away should not leave the PIN pad up for the next customer.
      setTimeout(() => { if (pad) close() }, 30000)
    }

    addEventListener('pointerdown', (e) => {
      if (pad) return
      if (e.clientX > ${CORNER_PX} || e.clientY > ${CORNER_PX}) { taps = []; return }
      const now = Date.now()
      taps = taps.filter((t) => now - t < ${WINDOW_MS})
      taps.push(now)
      if (taps.length >= ${TAPS}) { taps = []; open() }
    }, true)
  })()`
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {{ pin: string, onExit: () => void }} opts
 */
function installExitHatch(win, { pin, onExit }) {
  // Re-injected on every navigation: a reload would otherwise drop the only
  // touch-reachable way out of a fullscreen app.
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(overlayScript(pin)).catch(() => {})
  })

  // A plugged-in keyboard, for support. Registered on the window rather than as
  // a global accelerator so it cannot fire while the panel is in the background.
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return
    if (input.control && input.alt && input.shift && input.key.toLowerCase() === 'q') onExit()
  })
}

module.exports = { installExitHatch }
