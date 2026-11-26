import { describe, expect, it } from 'vitest'
import { handle, type Env } from '../hosting/src/worker'
import { COOKIE, SESSION_SECONDS, readSession, signSession } from '../hosting/src/session'

const SECRET = 's'.repeat(40)
const PIN = '12345678'
const NOW = Date.UTC(2026, 10, 26, 12)
const ORIGIN = 'https://totem.chefcontrol.ai'

function assets(files: Record<string, string>) {
  const seen: string[] = []
  return {
    seen,
    fetch: async (request: Request) => {
      const path = new URL(request.url).pathname
      seen.push(path)
      return path in files ? new Response(files[path]) : new Response('nope', { status: 404 })
    },
  }
}

function env(overrides: Partial<Env> = {}): Env & { ASSETS: ReturnType<typeof assets> } {
  return {
    ASSETS: assets({
      '/chefcontrol/index.html': '<html>chef</html>',
      '/chefcontrol/assets/index-abc.js': 'console.log("VITE_BP_TOTEM_KEY")',
    }),
    SESSION_SECRET: SECRET,
    PIN_CHEFCONTROL: PIN,
    ...overrides,
  } as Env & { ASSETS: ReturnType<typeof assets> }
}

const nav = (path: string, cookie?: string) =>
  new Request(`${ORIGIN}${path}`, {
    headers: { 'Sec-Fetch-Mode': 'navigate', ...(cookie ? { Cookie: `${COOKIE}=${cookie}` } : {}) },
  })

const enter = (pin: string, app = 'chefcontrol', cookie?: string) =>
  new Request(`${ORIGIN}/_totem/entrar`, {
    method: 'POST',
    body: new URLSearchParams({ app, pin }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: `${COOKIE}=${cookie}` } : {}) },
  })

const cookieFrom = (response: Response) =>
  /__Host-totem=([^;]*)/.exec(response.headers.get('Set-Cookie') ?? '')?.[1]

describe('hosted totem gate', () => {
  it('sends a visitor without a session to the selector, and never serves the bundle', async () => {
    const e = env()
    const page = await handle(nav('/'), e, NOW)
    expect(page.status).toBe(303)
    expect(page.headers.get('Location')).toBe('/_totem')

    const js = await handle(new Request(`${ORIGIN}/assets/index-abc.js`), e, NOW)
    expect(js.status).toBe(401)
    expect(await js.text()).not.toContain('VITE_BP_TOTEM_KEY')
    expect(e.ASSETS.seen).toEqual([])
  })

  it('lists only the apps that have a PIN configured', async () => {
    const html = await (await handle(nav('/_totem'), env(), NOW)).text()
    expect(html).toContain('ChefControl')
    expect(html).not.toContain("Walter")
  })

  it('refuses a wrong PIN without setting a cookie', async () => {
    const response = await handle(enter('00000000'), env(), NOW)
    expect(response.headers.get('Location')).toBe('/_totem?aviso=pin&app=chefcontrol')
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })

  it('unlocks the app with the right PIN and then serves it at the root', async () => {
    const e = env()
    const login = await handle(enter(PIN), e, NOW)
    expect(login.headers.get('Location')).toBe('/')
    expect(login.headers.get('Clear-Site-Data')).toContain('storage')
    const cookie = cookieFrom(login)!
    expect(login.headers.get('Set-Cookie')).toContain('HttpOnly')

    const root = await handle(nav('/', cookie), e, NOW)
    expect(await root.text()).toBe('<html>chef</html>')
    expect(root.headers.get('Cache-Control')).toBe('private, no-cache')

    const js = await handle(new Request(`${ORIGIN}/assets/index-abc.js`, { headers: { Cookie: `${COOKIE}=${cookie}` } }), e, NOW)
    expect(js.status).toBe(200)
    expect(js.headers.get('Cache-Control')).toContain('immutable')

    // An unknown path inside the app falls back to its shell.
    const deep = await handle(nav('/qualquer/coisa', cookie), e, NOW)
    expect(await deep.text()).toBe('<html>chef</html>')
  })

  it('does not wipe storage when the same app signs in again', async () => {
    const cookie = await signSession('chefcontrol', SECRET, PIN, NOW)
    const again = await handle(enter(PIN, 'chefcontrol', cookie), env(), NOW)
    expect(again.headers.get('Clear-Site-Data')).toBeNull()
  })

  it('signs everyone out of an app when its PIN changes', async () => {
    const cookie = await signSession('chefcontrol', SECRET, PIN, NOW)
    const response = await handle(nav('/', cookie), env({ PIN_CHEFCONTROL: '87654321' }), NOW)
    expect(response.headers.get('Location')).toBe('/_totem')
  })

  it('rejects a tampered, expired or foreign-app cookie', async () => {
    const cookie = await signSession('chefcontrol', SECRET, PIN, NOW)
    const pins = (app: string) => (app === 'chefcontrol' ? PIN : undefined)
    expect(await readSession(cookie, SECRET, pins, NOW)).not.toBeNull()
    expect(await readSession(cookie.replace('chefcontrol', 'walters'), SECRET, () => PIN, NOW)).toBeNull()
    expect(await readSession(cookie.slice(0, -2) + 'xx', SECRET, pins, NOW)).toBeNull()
    expect(await readSession(cookie, SECRET, pins, NOW + (SESSION_SECONDS + 1) * 1000)).toBeNull()
    expect(await readSession(cookie, 't'.repeat(40), pins, NOW)).toBeNull()
  })

  it('renews a day-old session on navigation so a panel in use never expires', async () => {
    const cookie = await signSession('chefcontrol', SECRET, PIN, NOW)
    const fresh = await handle(nav('/', cookie), env(), NOW + 60_000)
    expect(fresh.headers.get('Set-Cookie')).toBeNull()
    const later = await handle(nav('/', cookie), env(), NOW + 2 * 86_400_000)
    expect(cookieFrom(later)).toBeTruthy()
  })

  it('stops PIN guessing once the limiter says so', async () => {
    const response = await handle(enter(PIN), env({ PIN_LIMITER: { limit: async () => ({ success: false }) } }), NOW)
    expect(response.headers.get('Location')).toBe('/_totem?aviso=espera&app=chefcontrol')
    expect(response.headers.get('Set-Cookie')).toBeNull()
  })

  it('refuses to run without a real session secret', async () => {
    expect((await handle(nav('/_totem'), env({ SESSION_SECRET: 'short' }), NOW)).status).toBe(503)
  })

  it('signing out clears the cookie and the cached app', async () => {
    const response = await handle(nav('/_totem/sair'), env(), NOW)
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect(response.headers.get('Clear-Site-Data')).toContain('cache')
  })
})
