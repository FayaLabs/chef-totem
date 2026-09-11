#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Turns the demo houses into a catalog the ChefControl cluster can sell.
//
// The panel's three houses (src/demo/tenants.ts) are the theatre: brand,
// palette, copy, photos and the immersive pizza and burger builders. The order
// they produce has to land in a REAL tenant, and that tenant validates every
// line server-side — product ids, names and prices all come from its database,
// never from the panel. So the houses have to exist there as products.
//
// This writes that seed as one idempotent SQL block. It is generated, not
// typed, because the prices on the glass and the prices on the comanda must be
// the same number: the moment someone edits a price in tenants.ts, the seed is
// regenerated and the two stay in step.
//
// Usage:
//   node scripts/gen-beautyplace-seed.mjs --slug feira-demo > seed.sql
//   node scripts/gen-beautyplace-seed.mjs --tenant 13 > seed.sql
//
// Prefer --slug: the emitted block looks the tenant up by `licenses.slug` and
// does nothing when that tenant is absent, so the same file is safe to apply in
// any environment — including one where the demo house does not exist.
//
// The output is meant to be committed as a migration in the cluster's repo.
// ---------------------------------------------------------------------------

import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const slug = args.includes('--slug') ? String(args[args.indexOf('--slug') + 1] ?? '') : ''
const tenantId = args.includes('--tenant') ? Number(args[args.indexOf('--tenant') + 1]) : 0
if (!slug && !(Number.isInteger(tenantId) && tenantId > 0)) {
  console.error('usage: node scripts/gen-beautyplace-seed.mjs --slug <slug> | --tenant <id>')
  process.exit(1)
}

/** SQL string literal, quotes doubled. */
const q = (value) => `'${String(value).replace(/'/g, "''")}'`
const qOrNull = (value) => (value == null || value === '' ? 'null' : q(value))
/** Cents on the panel, reais in the cluster — the column is numeric(_, 2). */
const money = (cents) => (cents / 100).toFixed(2)

async function loadHouses() {
  const dir = await mkdtemp(join(tmpdir(), 'totem-seed-'))
  const outfile = join(dir, 'tenants.mjs')
  await build({
    entryPoints: [resolve('src/demo/tenants.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'error',
  })
  const module = await import(pathToFileURL(outfile).href)
  await rm(dir, { recursive: true, force: true })
  return module.DEMO_TENANTS
}

const houses = await loadHouses()
const lines = []
const say = (line = '') => lines.push(line)

say('-- ═══════════════════════════════════════════════════════════════════════════')
say('-- Self-service totem catalog.')
say('--')
say('-- GENERATED FILE — do not edit by hand. Regenerate with:')
say(`--   node scripts/gen-beautyplace-seed.mjs ${slug ? `--slug ${slug}` : `--tenant ${tenantId}`}   (chef-totem repo)`)
say('--')
say('-- These products exist so a kiosk sale is a real sale: the totem order')
say('-- endpoint prices every line from `products.sale_price` and every option from')
say('-- `product_option_items.additional_price`, so the comanda, the fatura and the')
say('-- kitchen ticket all agree with what the customer was charged.')
say('--')
say('-- They are deliberately INVISIBLE to the tenant\'s own surfaces:')
say('--   menu_available = false  → never in the guest digital menu')
say('--   pdv_available  = false  → never in the POS product search')
say('--   show_in_menu   = false  → the category itself is hidden too')
say('-- `internal_code` carries the panel\'s own product id, which is how the totem')
say('-- resolves ids at boot without hardcoding database keys.')
say('--')
say('-- Re-running converges: products are matched by internal_code and updated,')
say('-- and each seeded product\'s option groups are rebuilt from scratch. A house')
say('-- that is not in this database is not an error — the block simply does')
say('-- nothing, so the file is safe to apply anywhere.')
say('-- ═══════════════════════════════════════════════════════════════════════════')
say()
say('do $$')
say('declare')
say('  v_tenant bigint;')
say('  v_category bigint;')
say('  v_product bigint;')
say('  v_group bigint;')
say('begin')
if (slug) {
  say(`  select id into v_tenant from public.licenses where slug = ${q(slug)};`)
  say('  if v_tenant is null then')
  say(`    raise notice 'No tenant with slug ${slug.replace(/'/g, "''")} — nothing seeded.';`)
  say('    return;')
  say('  end if;')
} else {
  say(`  select id into v_tenant from public.licenses where id = ${tenantId};`)
  say('  if v_tenant is null then')
  say(`    raise notice 'No tenant ${tenantId} — nothing seeded.';`)
  say('    return;')
  say('  end if;')
}

let menuOrder = 900
for (const [houseId, house] of Object.entries(houses)) {
  const categoryName = `Totem · ${house.brand.name}`
  say()
  say(`  -- ── ${house.brand.name} (${houseId}) ──────────────────────────────────────`)
  say(`  select id into v_category from public.product_categories`)
  say(`   where tenant_id = v_tenant and name = ${q(categoryName)} limit 1;`)
  say('  if v_category is null then')
  say('    insert into public.product_categories')
  say('      (tenant_id, name, active, show_in_menu, pdv_available, delivery_available, menu_order)')
  say(`    values (v_tenant, ${q(categoryName)}, true, false, false, false, ${menuOrder})`)
  say('    returning id into v_category;')
  say('  else')
  say('    update public.product_categories')
  say('       set active = true, show_in_menu = false, pdv_available = false')
  say('     where id = v_category;')
  say('  end if;')
  menuOrder += 1

  let productOrder = 0
  for (const product of house.catalog.products) {
    productOrder += 1
    say()
    say(`  -- ${product.name}`)
    say('  select id into v_product from public.products')
    say(`   where tenant_id = v_tenant and internal_code = ${q(product.id)} limit 1;`)
    say('  if v_product is null then')
    say('    insert into public.products')
    say('      (tenant_id, name, description, sale_price, category_id, internal_code,')
    say('       active, is_for_sale, menu_available, pdv_available, menu_order)')
    say(`    values (v_tenant, ${q(product.name)}, ${qOrNull(product.description)}, ${money(product.priceCents)},`)
    say(`            v_category, ${q(product.id)}, true, true, false, false, ${productOrder})`)
    say('    returning id into v_product;')
    say('  else')
    say('    update public.products')
    say(`       set name = ${q(product.name)},`)
    say(`           description = ${qOrNull(product.description)},`)
    say(`           sale_price = ${money(product.priceCents)},`)
    say('           category_id = v_category,')
    say('           active = true, is_for_sale = true,')
    say('           menu_available = false, pdv_available = false')
    say('     where id = v_product;')
    say('  end if;')

    // Options are rebuilt rather than diffed: the panel is the source of truth
    // for what a burger can carry, and a stale option is a price nobody quoted.
    say('  delete from public.product_option_items')
    say('   where group_id in (select id from public.product_option_groups')
    say('                       where tenant_id = v_tenant and product_id = v_product);')
    say('  delete from public.product_option_groups')
    say('   where tenant_id = v_tenant and product_id = v_product;')

    let groupOrder = 0
    for (const group of product.modifierGroups ?? []) {
      groupOrder += 1
      say('  insert into public.product_option_groups')
      say('    (tenant_id, product_id, name, required, min_selections, max_selections, display_order, active)')
      say(`  values (v_tenant, v_product, ${q(group.name)}, ${group.required ? 'true' : 'false'},`)
      say(`          ${group.minSelections ?? 0}, ${group.maxSelections ?? 1}, ${groupOrder}, true)`)
      say('  returning id into v_group;')
      const values = group.modifiers.map((modifier, index) =>
        `    (v_tenant, v_group, ${q(modifier.name)}, ${money(modifier.surchargeCents)}, ${index + 1}, true)`)
      if (values.length > 0) {
        say('  insert into public.product_option_items')
        say('    (tenant_id, group_id, name, additional_price, display_order, active)')
        say('  values')
        say(values.join(',\n') + ';')
      }
    }
  }
}

say()
say('end $$;')
say()

process.stdout.write(lines.join('\n'))
