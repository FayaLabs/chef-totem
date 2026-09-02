import { activeDemoTenant } from '@/demo/tenants'
import type { CatalogProvider, TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// O cardápio do tenant de demonstração — NÃO um fallback.
//
// Só é alcançado com VITE_TOTEM_CATALOG=demo. Se o provedor ao vivo falhar, o
// painel mostra o erro; ele nunca serve isto no lugar em silêncio. Um quiosque
// que inventa um cardápio quando o backend cai tira pedidos que a cozinha nunca
// vai ver.
//
// O conteúdo mora em `src/demo/tenants.ts`, junto com a marca, a paleta, a
// cópia e a persona do assistente daquele restaurante. Estão no mesmo arquivo
// porque são a mesma decisão: o cardápio do Zedek com as cores do Café Sabor
// não é uma configuração possível, é um erro.
// ---------------------------------------------------------------------------

export function createDemoCatalog(): CatalogProvider {
  return {
    async load(): Promise<TotemCatalog> {
      return activeDemoTenant().catalog
    },
  }
}
