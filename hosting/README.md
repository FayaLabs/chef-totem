# Hosted totem: totem.chefcontrol.ai

The totem apps, reachable from any browser, behind one PIN screen. The panel
keeps running its own copy from disk (`npm run panel`); this is the same bundle
served from Cloudflare, for demos, a second screen, or a panel pointed at it
with `TOTEM_URL=https://totem.chefcontrol.ai`.

## How it works

- `/_totem` is the selector: pick an app, type its PIN on the on-screen pad.
- A right PIN sets a signed, HttpOnly cookie (`__Host-totem`) for that app,
  valid 30 days and renewed on every page load.
- Every other path needs that cookie. The app is served at `/` from
  `public/<app>/`, exactly as on the panel, so nothing is rebuilt with a
  sub-path base.
- **No app file is public**, including the JS. The bundle inlines the order
  door's shared secret and the device login, so the gate cannot live in the page.
- `/_totem/sair` signs out and clears the site's cache and storage. Signing in
  to a different app does the same, because both apps share one origin, one
  service-worker scope and one localStorage.
- PIN attempts are rate limited to 5 per minute per IP. PINs are 8 digits; an
  app with no PIN (or a shorter one) is not offered at all.
- Changing an app's PIN signs every browser out of that app.

## Deploy

```sh
npm run hosted          # build (SDK from FAYZ_SDK_DIR) + copy + wrangler deploy
```

Worker `chef-totem` in the FayaLabs Cloudflare account, custom domain
`totem.chefcontrol.ai`. The token defaults to `~/.config/fayz/cf-token-fayalabs`.

Secrets (`npx wrangler@4.168.0 secret put <NAME>` from `hosting/`):

| Secret | What |
|---|---|
| `SESSION_SECRET` | 32+ random characters; signs the cookie |
| `PIN_CHEFCONTROL` | 8-digit PIN for the ChefControl totem |
| `PIN_WALTERS` | not set yet: Walter's is listed but hidden until its build exists |

## Adding an app

1. Copy its build to `public/<id>/` in the deploy script.
2. Add an entry to `APPS` in `src/worker.ts`.
3. `wrangler secret put PIN_<ID>` with an 8-digit PIN.

## Known limit

The voice waiter's token function (`totem-voice-token`) answers CORS with a
hard-coded origin. The panel's shell rewrites that header; a plain browser on
this domain does not, so voice fails here until the function echoes the
requesting origin.
