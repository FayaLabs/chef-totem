// ---------------------------------------------------------------------------
// The session cookie: which totem app this browser unlocked, and until when.
//
// Format: `<app>.<expiresAtSeconds>.<base64url HMAC-SHA256>`.
//
// The HMAC key is derived from SESSION_SECRET *and the app's PIN*. Rotating a
// PIN therefore signs everyone out of that app on the next request, with no
// session store to purge: the old signatures simply stop verifying.
// ---------------------------------------------------------------------------

export const COOKIE = '__Host-totem'

/** Thirty days, renewed on every page load, so a panel in use never expires. */
export const SESSION_SECONDS = 30 * 24 * 60 * 60

/** Renew only once a day has passed, so asset requests do not churn cookies. */
const RENEW_AFTER_SECONDS = 24 * 60 * 60

const encoder = new TextEncoder()

function base64url(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, pin: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${secret}:${pin}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)))
}

/** Length-independent comparison; both inputs are short ASCII strings. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function signSession(app: string, secret: string, pin: string, now: number): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS
  const payload = `${app}.${exp}`
  return `${payload}.${await hmac(secret, pin, payload)}`
}

export interface Session {
  app: string
  /** Seconds since epoch. */
  exp: number
  /** True when the cookie is old enough that the response should reissue it. */
  stale: boolean
}

/**
 * @param pinFor the PIN currently configured for an app, or undefined when the
 *               app is not (or no longer) offered
 */
export async function readSession(
  value: string | undefined,
  secret: string,
  pinFor: (app: string) => string | undefined,
  now: number,
): Promise<Session | null> {
  if (!value) return null
  const [app, expText, signature, extra] = value.split('.')
  if (!app || !expText || !signature || extra !== undefined) return null
  const exp = Number(expText)
  const nowSeconds = Math.floor(now / 1000)
  if (!Number.isInteger(exp) || exp <= nowSeconds) return null
  const pin = pinFor(app)
  if (!pin) return null
  const expected = await hmac(secret, pin, `${app}.${exp}`)
  if (!safeEqual(signature, expected)) return null
  return { app, exp, stale: exp - nowSeconds < SESSION_SECONDS - RENEW_AFTER_SECONDS }
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return undefined
}

export function sessionCookie(value: string): string {
  return `${COOKIE}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}

export function clearedCookie(): string {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}
