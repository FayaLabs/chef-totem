# Selling into a ChefControl cluster

The panel has two backends for an ORDER, and they are not variants of each
other:

| | `pool` | `beautyplace` |
|---|---|---|
| Where the sale lands | resto-saas pool | a ChefControl cluster (BeautySoft/ymaia) |
| How the panel gets in | its own device login, RLS as usual | one anon Edge Function, gated by a shared secret |
| Who prices the line | `@fayz-ai/core/orders` | the cluster, from its own catalog |
| What the panel shows | the tenant's live catalog, or a demo house | the same |

`VITE_TOTEM_ORDER_BACKEND` chooses. The choice is deliberately independent of
which CATALOG is on the glass: at an event the panel shows a demo house —
brand, palette, the immersive pizza and burger builders — and the sale still has
to arrive in the tenant's kitchen, comanda and Financeiro. A misconfigured
cluster falls back to `pool` rather than dropping orders silently, and the
service panel says so.

## What a kiosk sale becomes in the cluster

One round trip to `public-booking`, and at the end of it:

1. a **BALCÃO comanda** — `table_orders` with `type = 'counter'` and
   `table_id = null`, the shape the ERP already renders in `TableGrid` and
   `OrderModal`. A kiosk has no mesa, no waiter and no guest count, so it never
   carries a service charge;
2. its **lines**, priced by the server from `products.sale_price` and
   `product_option_items.additional_price`, stamped `source = 'totem'`;
3. a **kitchen ticket**, enqueued through the same print outbox the digital
   menu uses;
4. the **client and the guest**, when the customer typed a phone;
5. the **payment and the fatura** — `order_payments` plus `posFinalizeOrder`,
   the same server-side finalizer `pos-confirm-payment` runs, so the sale
   reaches Financeiro and the Fechamento do Dia instead of sitting open.

The panel never sends a price. It reports what the terminal charged, and the
cluster refuses to close a comanda whose total disagrees — the check exists
because the customer's receipt and the tenant's books have to be the same
number.

## Setting one up

1. **Seed the catalog.** The demo houses have to exist as products in the target
   tenant, because the cluster validates every line against its own catalog:

   ```sh
   node scripts/gen-beautyplace-seed.mjs --tenant 8 \
     > ../beautyplace/supabase/migrations/<timestamp>_totem_demo_catalog_tenant8.sql
   ```

   The seeded rows are invisible to the tenant's own surfaces
   (`menu_available = false`, `pdv_available = false`, hidden category), and
   carry the panel's product id in `internal_code` — which is how the panel
   resolves database ids at boot instead of hardcoding them. Regenerate
   whenever a price or a modifier changes in `src/demo/tenants.ts`: the price on
   the glass and the price on the comanda must be the same number, and the
   service panel will refuse to stay quiet if they drift.

2. **Set the shared secret** on the cluster's project:

   ```sh
   supabase secrets set TOTEM_SHARED_SECRET=<32+ random chars>
   supabase functions deploy public-booking
   ```

3. **Point the panel at it** — see the `VITE_BP_*` block in `.env.example`.
   `VITE_BP_TOTEM_KEY` must equal `TOTEM_SHARED_SECRET`.

4. **Check the service panel** (tap the corner label). `Pedidos` names the
   backend and the tenant; `Catálogo do cluster` says how many products matched
   and names any that are missing or priced differently — before a queue forms.

## What the secret is, and is not

It is the panel's only credential, it lives in `.env`, and it is therefore
inside the packaged bundle. That is the same trust level as the till the panel
is bolted to: whoever can read this machine's disk can already take its money.
It is also why the door it opens is narrow — it can create a sale for one
tenant, priced from the database, and nothing else. Rotate it by setting a new
`TOTEM_SHARED_SECRET` and shipping a new panel build.
