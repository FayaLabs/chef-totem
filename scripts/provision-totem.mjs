#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Cria o usuário de aparelho deste totem.
//
// Um cliente no quiosque não tem conta, e toda política do pool é
// `authenticated` E membro do tenant E permissão. Então o painel entra como ELE
// MESMO — um usuário de serviço que é membro do tenant e tem só o que um
// quiosque precisa. A RLS continua valendo, todo pedido tem autor, e revogar um
// totem é desativar um usuário.
//
//   node scripts/provision-totem.mjs --tenant <uuid> [--email ...]
//
// Precisa de SUPABASE_PAT (Management API) — lido de ~/dev/fayz-sdk/.env(.local)
// quando não está no ambiente. Imprime as credenciais UMA vez; ponha no .env.
// A associação (papel `totem_kiosk`) é concedida em SQL: isto só cunha o
// usuário de auth.
// ---------------------------------------------------------------------------

import { randomBytes } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) =>
    a.startsWith('--') ? [[a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1]]] : [],
  ),
)

const PROJECT = args.project ?? 'klvfxzreepavcpyjiwla'
const EMAIL = args.email ?? 'totem.01@papaleguas.qa'

function pat() {
  if (process.env.SUPABASE_PAT) return process.env.SUPABASE_PAT
  for (const name of ['.env', '.env.local']) {
    const file = resolve(homedir(), 'dev/fayz-sdk', name)
    if (!existsSync(file)) continue
    const hit = readFileSync(file, 'utf8').match(/^SUPABASE_PAT=(.+)$/m)
    if (hit) return hit[1].trim()
  }
  throw new Error('SUPABASE_PAT not found (env or ~/dev/fayz-sdk/.env[.local])')
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${pat()}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

const keys = await api(`/projects/${PROJECT}/api-keys?reveal=true`)
const service = keys.find((k) => k.name === 'service_role')?.api_key
if (!service) throw new Error('no service_role key returned')
const url = `https://${PROJECT}.supabase.co`

const password = args.password ?? randomBytes(18).toString('base64url')

async function auth(path, init = {}) {
  const res = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${path} → ${res.status} ${body}`)
  return body ? JSON.parse(body) : null
}

const existing = await auth(`/admin/users?filter=${encodeURIComponent(EMAIL)}`)
const found = existing.users?.find((u) => u.email === EMAIL)

const user = found
  ? await auth(`/admin/users/${found.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password, email_confirm: true }),
    })
  : await auth('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Totem 1 · Quiosque' },
      }),
    })

console.log(JSON.stringify({ userId: user.id, email: EMAIL, password, url }, null, 2))
console.log('\nNext: conceda a associação (app.memberships + app.user_unit_access), depois ponha isto no .env.')
