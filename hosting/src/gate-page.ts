// ---------------------------------------------------------------------------
// The selector + PIN screen.
//
// It runs on a touch panel with no physical keyboard, and the Windows touch
// keyboard is locked down there, so the PIN pad is drawn on the page. It also
// works with a keyboard in a normal browser. Plain HTML and a few lines of
// script: this page must load before anything else is allowed to.
//
// The copy is pt-BR on purpose: it is what staff read at the counter.
// ---------------------------------------------------------------------------

export interface GateApp {
  id: string
  label: string
  subtitle: string
}

export type GateNotice = 'wrong-pin' | 'too-many' | 'signed-out' | undefined

const NOTICES: Record<Exclude<GateNotice, undefined>, string> = {
  'wrong-pin': 'PIN incorreto. Tente de novo.',
  'too-many': 'Muitas tentativas. Espere um minuto e tente de novo.',
  'signed-out': 'Totem bloqueado. Escolha o app e digite o PIN.',
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function gatePage(apps: GateApp[], notice: GateNotice, selected?: string): string {
  const initial = apps.find((a) => a.id === selected)?.id ?? (apps.length === 1 ? apps[0]!.id : '')
  const cards = apps
    .map(
      (a) => `<button type="button" class="app" data-app="${escape(a.id)}" aria-pressed="${a.id === initial}">
        <span class="name">${escape(a.label)}</span><span class="sub">${escape(a.subtitle)}</span></button>`,
    )
    .join('')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']
    .map((k) =>
      k === 'clear'
        ? '<button type="button" class="key muted" data-key="clear" aria-label="Limpar">C</button>'
        : k === 'back'
          ? '<button type="button" class="key muted" data-key="back" aria-label="Apagar">&#9003;</button>'
          : `<button type="button" class="key" data-key="${k}">${k}</button>`,
    )
    .join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<meta name="robots" content="noindex, nofollow">
<title>Totem</title>
<style>
  :root { color-scheme: dark; --bg:#0B0B0C; --card:#17171A; --line:#2A2A2F; --text:#F4F4F5; --dim:#A1A1AA; --accent:#F97316; --bad:#F87171; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; height:100%; background:var(--bg); color:var(--text);
    font: 16px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; user-select:none; }
  main { min-height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:clamp(20px,4vh,40px); padding:clamp(20px,5vw,64px); }
  h1 { margin:0; font-size:clamp(24px,4vw,44px); font-weight:650; letter-spacing:-0.01em; }
  .notice { margin:0; min-height:1.4em; color:var(--dim); font-size:clamp(15px,2vw,20px); text-align:center; }
  .notice.bad { color:var(--bad); }
  .apps { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; width:min(720px,100%); }
  .app { display:flex; flex-direction:column; gap:4px; padding:clamp(18px,3vw,28px); text-align:left;
    background:var(--card); border:2px solid var(--line); border-radius:20px; color:inherit; font:inherit; cursor:pointer; }
  .app[aria-pressed="true"] { border-color:var(--accent); }
  .app .name { font-size:clamp(20px,3vw,30px); font-weight:650; }
  .app .sub { color:var(--dim); }
  form { display:flex; flex-direction:column; align-items:center; gap:clamp(16px,3vh,28px); }
  form[hidden] { display:none; }
  .pin { width:min(360px,80vw); padding:14px; text-align:center; font-size:clamp(28px,5vw,44px); letter-spacing:0.4em;
    background:var(--card); border:2px solid var(--line); border-radius:16px; color:var(--text); outline:none; }
  .pin:focus { border-color:var(--accent); }
  .pad { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:min(360px,80vw); }
  .key { aspect-ratio:1.4; font:inherit; font-size:clamp(24px,4vw,36px); font-weight:600; color:var(--text);
    background:var(--card); border:1px solid var(--line); border-radius:16px; cursor:pointer; }
  .key:active { background:var(--line); }
  .key.muted { color:var(--dim); }
  .go { width:min(360px,80vw); padding:18px; font:inherit; font-size:clamp(20px,3vw,26px); font-weight:650;
    color:#111; background:var(--accent); border:0; border-radius:16px; cursor:pointer; }
  .go:disabled { opacity:.4; cursor:default; }
</style>
</head>
<body>
<main>
  <h1>Escolha o totem</h1>
  <div class="apps" role="group" aria-label="Apps de totem">${cards}</div>
  <p class="notice${notice === 'wrong-pin' || notice === 'too-many' ? ' bad' : ''}" role="status">${notice ? NOTICES[notice] : ''}</p>
  <form method="post" action="/_totem/entrar" ${initial ? '' : 'hidden'}>
    <input type="hidden" name="app" value="${escape(initial)}">
    <input class="pin" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="16"
      placeholder="PIN" aria-label="PIN" required>
    <div class="pad">${keys}</div>
    <button class="go" type="submit" disabled>Entrar</button>
  </form>
</main>
<script>
  const form = document.querySelector('form')
  const pin = form.querySelector('.pin')
  const app = form.querySelector('[name=app]')
  const go = form.querySelector('.go')
  const sync = () => { go.disabled = !pin.value || !app.value }
  document.querySelectorAll('.app').forEach((card) => card.addEventListener('click', () => {
    document.querySelectorAll('.app').forEach((c) => c.setAttribute('aria-pressed', String(c === card)))
    app.value = card.dataset.app
    form.hidden = false
    pin.value = ''
    sync()
  }))
  document.querySelectorAll('.key').forEach((key) => key.addEventListener('click', () => {
    const k = key.dataset.key
    if (k === 'clear') pin.value = ''
    else if (k === 'back') pin.value = pin.value.slice(0, -1)
    else if (pin.value.length < 16) pin.value += k
    sync()
  }))
  pin.addEventListener('input', sync)
  form.addEventListener('submit', () => { go.disabled = true })
</script>
</body>
</html>`
}
