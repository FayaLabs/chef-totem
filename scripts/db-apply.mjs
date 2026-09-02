// Applies the totem's own SQL to the restaurant pool, in filename order.
//
// The totem owns two functions and one additive column; everything else in this
// pool belongs to the platform or to a plugin and is applied by their pipelines.
// Every file here is authored idempotent (CREATE OR REPLACE / IF NOT EXISTS), so
// re-running is safe and is the normal way to ship a change.
//
// Usage: SUPABASE_PAT=sbp_... node scripts/db-apply.mjs
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const REF = process.env.SUPABASE_REF || 'mgctsbkyykomwaopkbjm'

function readEnvFile(file, key) {
  if (!existsSync(file)) return undefined
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`))
  return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : undefined
}

const PAT =
  process.env.SUPABASE_PAT ||
  readEnvFile(resolve(ROOT, '../../fayz-sdk/.env.local'), 'SUPABASE_PAT')
if (!PAT) {
  console.error('✗ SUPABASE_PAT não definido (env ou fayz-sdk/.env.local)')
  process.exit(1)
}

async function run(sql, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`  ✗ ${label} → ${res.status} ${text.slice(0, 600)}`)
    process.exit(1)
  }
  console.log(`  ✓ ${label}`)
}

const dir = resolve(ROOT, 'supabase', 'migrations')
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.sql')).sort() : []
if (files.length === 0) {
  console.log('nada a aplicar')
  process.exit(0)
}

console.log(`▸ SQL do chef-totem → ${REF}`)
for (const f of files) await run(readFileSync(resolve(dir, f), 'utf8'), f)
await run("NOTIFY pgrst, 'reload schema';", 'reload do cache de schema do PostgREST')
console.log('✓ pronto')
