// ---------------------------------------------------------------------------
// totem.chefcontrol.ai: the hosted totem apps, behind one PIN gate.
//
// ONE ORIGIN, THE COOKIE PICKS THE APP. Every app is served at `/`, exactly as
// it runs on the panel, from `public/<app>/`. The signed session cookie says
// which app this browser unlocked. Nothing is rebuilt with a sub-path `base`:
// the totem references dozens of absolute `/demo/...` paths, and a gate should
// not be the reason an app has to change.
//
// THE GATE IS ON THE SERVER, NOT ON THE PAGE. The totem bundle inlines a
// shared secret for the order door and the device's login. A PIN checked in
// JavaScript would leave the bundle downloadable by anyone, so no app file,
// not even the JS, is served without a valid session.
//
// Switching apps clears the site's storage (Clear-Site-Data). Two apps share
// this origin, so they share a service-worker scope and localStorage, and a
// leftover service worker would keep serving the previous app's cache.
// ---------------------------------------------------------------------------

import { gatePage, type GateApp, type GateNotice } from './gate-page'
import { clearedCookie, COOKIE, readCookie, readSession, safeEqual, sessionCookie, signSession } from './session'

/** The bits of the Workers runtime this file uses, so it needs no type package. */
interface AssetFetcher {
  fetch(request: Request): Promise<Response>
}
interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  ASSETS: AssetFetcher
  /** Optional: absent in tests and local runs. */
  PIN_LIMITER?: RateLimiter
  SESSION_SECRET: string
  PIN_CHEFCONTROL?: string
  PIN_WALTERS?: string
}

interface AppEntry extends GateApp {
  pin: (env: Env) => string | undefined
}

/**
 * The apps the gate can offer. An app shows up only while its PIN secret is
 * set, so adding one is: a `public/<id>/` build, an entry here, and
 * `wrangler secret put PIN_<ID>`.
 */
export const APPS: AppEntry[] = [
  { id: 'chefcontrol', label: 'ChefControl', subtitle: 'Autoatendimento do restaurante', pin: (env) => env.PIN_CHEFCONTROL },
  { id: 'walters', label: "Walter's", subtitle: 'Check-in do salão', pin: (env) => env.PIN_WALTERS },
]

const GATE = '/_totem'

const offered = (env: Env) => APPS.filter((a) => (a.pin(env) ?? '').length >= 8)
const pinFor = (env: Env) => (id: string) => offered(env).find((a) => a.id === id)?.pin(env)

const BASE_HEADERS: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

function isNavigation(request: Request): boolean {
  const mode = request.headers.get('Sec-Fetch-Mode')
  if (mode) return mode === 'navigate'
  return (request.headers.get('Accept') ?? '').includes('text/html')
}

function redirect(location: string, extra: Record<string, string> = {}): Response {
  return new Response(null, { status: 303, headers: { ...BASE_HEADERS, Location: location, 'Cache-Control': 'no-store', ...extra } })
}

function page(env: Env, notice: GateNotice, selected?: string, status = 200): Response {
  return new Response(gatePage(offered(env), notice, selected), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function enter(request: Request, env: Env, now: number): Promise<Response> {
  const form = await request.formData().catch(() => null)
  const app = String(form?.get('app') ?? '')
  const pin = String(form?.get('pin') ?? '')

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (env.PIN_LIMITER && !(await env.PIN_LIMITER.limit({ key: `pin:${ip}` })).success) {
    return redirect(`${GATE}?aviso=espera&app=${encodeURIComponent(app)}`)
  }

  const expected = pinFor(env)(app)
  if (!expected || !safeEqual(pin, expected)) {
    return redirect(`${GATE}?aviso=pin&app=${encodeURIComponent(app)}`)
  }

  const previous = await readSession(readCookie(request.headers.get('Cookie'), COOKIE), env.SESSION_SECRET, pinFor(env), now)
  const extra: Record<string, string> = { 'Set-Cookie': sessionCookie(await signSession(app, env.SESSION_SECRET, expected, now)) }
  // A different app (or none before) may have left a service worker behind.
  if (previous?.app !== app) extra['Clear-Site-Data'] = '"cache", "storage"'
  return redirect('/', extra)
}

function leave(): Response {
  return redirect(`${GATE}?aviso=saiu`, { 'Set-Cookie': clearedCookie(), 'Clear-Site-Data': '"cache", "storage"' })
}

async function serveApp(request: Request, env: Env, app: string): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname === '/' ? '/index.html' : url.pathname
  const assetUrl = (p: string) => new URL(`/${app}${p}`, url.origin)

  let response = await env.ASSETS.fetch(new Request(assetUrl(path), { method: request.method, headers: request.headers }))
  // Client-side routes fall back to the app shell, like any SPA host does.
  if (response.status === 404 && isNavigation(request)) {
    response = await env.ASSETS.fetch(new Request(assetUrl('/index.html'), { method: request.method, headers: request.headers }))
  }

  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(BASE_HEADERS)) headers.set(k, v)
  // Private: these files are behind a login, so no shared cache may keep them.
  const hashed = /^\/assets\//.test(path)
  headers.set('Cache-Control', hashed ? 'private, max-age=31536000, immutable' : 'private, no-cache')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export async function handle(request: Request, env: Env, now = Date.now()): Promise<Response> {
  // Without a secret every signature would be forgeable from the PIN alone.
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return new Response('Gate not configured', { status: 503, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' } })
  }
  const url = new URL(request.url)

  if (url.pathname === GATE || url.pathname === `${GATE}/`) {
    const aviso = url.searchParams.get('aviso')
    const notice: GateNotice =
      aviso === 'pin' ? 'wrong-pin' : aviso === 'espera' ? 'too-many' : aviso === 'saiu' ? 'signed-out' : undefined
    return page(env, notice, url.searchParams.get('app') ?? undefined)
  }
  if (url.pathname === `${GATE}/entrar` && request.method === 'POST') return enter(request, env, now)
  if (url.pathname === `${GATE}/sair`) return leave()

  const session = await readSession(readCookie(request.headers.get('Cookie'), COOKIE), env.SESSION_SECRET, pinFor(env), now)
  if (!session) {
    if (isNavigation(request)) return redirect(GATE)
    return new Response('Unauthorized', { status: 401, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store' } })
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { ...BASE_HEADERS, Allow: 'GET, HEAD' } })
  }

  const response = await serveApp(request, env, session.app)
  if (session.stale && isNavigation(request)) {
    const pin = pinFor(env)(session.app)!
    response.headers.append('Set-Cookie', sessionCookie(await signSession(session.app, env.SESSION_SECRET, pin, now)))
  }
  return response
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
}
