import { totemConfig } from '@/config/totem.config'
import { deviceClient } from '@/menu/device-session'
import type { CatalogProvider, TotemCatalog, TotemModifierGroup } from '@/menu/types'

// ---------------------------------------------------------------------------
// The menu, read from the same pool ChefControl writes.
//
// Read-only by construction: this file has no insert, update or delete. The
// totem never edits the menu — if a dish is wrong, it is wrong in ChefControl.
//
// The shape here is the restaurant pool's, which is older than plugin-menu's
// menus/sections model: an item is a `products` row and the restaurant-specific
// bits (sold out, featured, prep time) live in `menu_items` keyed by product.
//
// Categories are read regardless of `kind`, and then filtered to the ones that
// actually have something sellable in them. Keying on kind = 'menu_category'
// looked right and was wrong: Artorius sells real food out of a category with
// kind = 'product' (it grew out of a shop), while its three `menu_category`
// rows are inactive and empty. A totem should not care which noun a tenant
// happened to file its food under — it should show the food.
// ---------------------------------------------------------------------------

const CENTS = (value: unknown): number => Math.round(Number(value ?? 0) * 100)

export function createSupabaseCatalog(): CatalogProvider {
  return {
    async load(): Promise<TotemCatalog> {
      const supabase = await deviceClient()
      const tenantId = totemConfig.tenantId

      const [categories, products, menuItems, groups, modifiers, links] = await Promise.all([
        supabase
          .from('categories')
          .select('id,name,icon,sort_order,kind')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('products')
          .select('id,name,description,price,image_url,category_id,metadata')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('menu_items')
          .select('product_id,status,is_featured,sort_order,available_for_pos')
          .eq('tenant_id', tenantId),
        supabase
          .from('menu_modifier_groups')
          .select('id,name,is_required,min_selections,max_selections,sort_order')
          .eq('tenant_id', tenantId)
          .order('sort_order'),
        supabase
          .from('menu_modifiers')
          .select('id,group_id,name,price_adjustment,sort_order')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('menu_item_modifier_groups')
          .select('product_id,group_id,sort_order')
          .eq('tenant_id', tenantId)
          .order('sort_order'),
      ])

      const firstError = [categories, products, menuItems, groups, modifiers, links].find((r) => r.error)
      if (firstError?.error) throw new Error(firstError.error.message)

      const itemByProduct = new Map((menuItems.data ?? []).map((row) => [row.product_id as string, row]))

      const modifiersByGroup = new Map<string, TotemModifierGroup['modifiers']>()
      for (const row of modifiers.data ?? []) {
        const list = modifiersByGroup.get(row.group_id as string) ?? []
        list.push({
          id: row.id as string,
          name: row.name as string,
          surchargeCents: CENTS(row.price_adjustment),
        })
        modifiersByGroup.set(row.group_id as string, list)
      }

      const groupById = new Map(
        (groups.data ?? []).map((row) => [
          row.id as string,
          {
            id: row.id as string,
            name: row.name as string,
            required: Boolean(row.is_required),
            minSelections: Number(row.min_selections ?? 0),
            maxSelections: Number(row.max_selections ?? 1),
            modifiers: modifiersByGroup.get(row.id as string) ?? [],
          } satisfies TotemModifierGroup,
        ]),
      )

      const groupsByProduct = new Map<string, TotemModifierGroup[]>()
      for (const row of links.data ?? []) {
        const group = groupById.get(row.group_id as string)
        if (!group) continue
        const list = groupsByProduct.get(row.product_id as string) ?? []
        list.push(group)
        groupsByProduct.set(row.product_id as string, list)
      }

      const sellable = (products.data ?? [])
          .map((row) => {
            const item = itemByProduct.get(row.id as string)
            const metadata = (row.metadata ?? {}) as Record<string, unknown>
            return {
              id: row.id as string,
              name: row.name as string,
              description: (row.description as string | null) ?? undefined,
              priceCents: CENTS(row.price),
              // The pool has no compare-at column; a promotion is recorded in
              // the product's metadata by ChefControl. Absent = not on offer.
              compareAtCents:
                typeof metadata.compare_at_price === 'number'
                  ? CENTS(metadata.compare_at_price)
                  : undefined,
              imageUrl: (row.image_url as string | null) ?? undefined,
              videoUrl: typeof metadata.video_url === 'string' ? metadata.video_url : undefined,
              categoryId: (row.category_id as string | null) ?? undefined,
              soldOut: item ? item.status !== 'available' : false,
              featured: Boolean(item?.is_featured),
              modifierGroups: groupsByProduct.get(row.id as string) ?? [],
            }
          })
        // A dish with no price is an ingredient someone typed into the
        // catalog, not something a customer can buy.
        .filter((product) => product.priceCents > 0)

      // Only categories that lead somewhere. An empty tab on a kiosk is a dead
      // end the customer has to back out of, in front of a queue.
      const populated = new Set(sellable.map((product) => product.categoryId).filter(Boolean))

      return {
        categories: (categories.data ?? [])
          .filter((row) => populated.has(row.id as string))
          .map((row) => ({
            id: row.id as string,
            name: row.name as string,
            icon: (row.icon as string | null) ?? undefined,
            sortOrder: Number(row.sort_order ?? 0),
          })),
        products: sellable,
      }
    },
  }
}
