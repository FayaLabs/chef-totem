import { useCart } from '@/cart/useCart'
import { draftBlocking, draftModifiers, useProductDraft } from '@/menu/useProductDraft'
import { useMenuUi } from '@/menu/useMenuUi'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiter } from '@/waiter/useWaiter'
import type { TotemCatalog, TotemProduct } from '@/menu/types'

// ---------------------------------------------------------------------------
// What the waiter can DO.
//
// The declaration and the executor live in the same object on purpose. Two
// separate lists — a JSON schema over here, a switch statement over there —
// drift, and the failure is a model confidently calling a tool that no longer
// does what its description says.
//
// Every tool moves the SCREEN, not just the data. "Adiciona uma costela" opens
// the sheet the customer would have opened; they watch the order being taken
// instead of finding it already done.
//
// There is deliberately no tool that pays. The waiter walks the customer to
// the payment screen and stops — a model that can charge a card is a different
// risk class from one that can fill a basket.
// ---------------------------------------------------------------------------

export interface WaiterTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>, catalog: TotemCatalog) => string
}

/**
 * Fold accents and case before comparing.
 *
 * Without this, `"média".includes("media")` is false and the waiter refuses an
 * option the customer just named. Speech transcripts do not spell accents
 * reliably in any language that has them, and neither do people typing on a
 * kiosk keyboard — so every match in this file goes through here.
 */
const norm = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const str = (args: Record<string, unknown>, key: string): string =>
  typeof args[key] === 'string' ? (args[key] as string) : ''

const num = (args: Record<string, unknown>, key: string, fallback: number): number =>
  typeof args[key] === 'number' ? (args[key] as number) : fallback

/** Loose match by name — a spoken order rarely repeats the catalog verbatim. */
function findProduct(catalog: TotemCatalog, query: string): TotemProduct | null {
  const needle = norm(query)
  if (!needle) return null
  const products = catalog.products
  return (
    products.find((p) => p.id === query) ??
    products.find((p) => norm(p.name) === needle) ??
    products.find((p) => norm(p.name).includes(needle)) ??
    products.find((p) => needle.includes(norm(p.name))) ??
    null
  )
}

function openProductOrNull(catalog: TotemCatalog): TotemProduct | null {
  const id = useProductDraft.getState().productId
  return catalog.products.find((p) => p.id === id) ?? null
}

export const WAITER_TOOLS: WaiterTool[] = [
  {
    name: 'describe_options',
    description:
      'Lista os grupos de opção do prato ABERTO na tela — o que é obrigatório, o que é adicional, quanto cada um custa e o que já está marcado. Chame ANTES de perguntar sobre adicionais: sem isto você não sabe o que a casa oferece e acaba inventando ou perguntando genérico.',
    parameters: { type: 'object', properties: {} },
    execute: (_args, catalog) => {
      const product = openProductOrNull(catalog)
      if (!product) return 'Nenhum prato aberto. Abra um com open_product primeiro.'
      if (product.modifierGroups.length === 0) return `${product.name} não tem opções — é só adicionar.`

      const chosen = useProductDraft.getState().chosen
      return JSON.stringify({
        prato: product.name,
        grupos: product.modifierGroups.map((group) => ({
          grupo: group.name,
          obrigatorio: group.required,
          escolhe_ate: group.maxSelections,
          ja_marcado: group.modifiers
            .filter((m) => (chosen[group.id] ?? []).includes(m.id))
            .map((m) => m.name),
          opcoes: group.modifiers.map((m) => ({
            nome: m.name,
            // Zero vira null para o modelo não anunciar "mais zero reais".
            adicional: m.surchargeCents > 0 ? m.surchargeCents / 100 : null,
          })),
        })),
      })
    },
  },

  {
    name: 'highlight_product',
    description:
      'APONTA para um prato no cardápio: desce até ele, aumenta e apaga os outros por alguns segundos. Use quando for FALAR de um prato — recomendar, comparar, responder "o que tem de bom". NUNCA no mesmo turno que open_product: apontar e abrir são duas formas de dizer "é este", e as duas juntas são dois movimentos ao mesmo tempo. Aponte para falar; abra para personalizar.',
    parameters: {
      type: 'object',
      properties: { product: { type: 'string', description: 'Nome do prato' } },
      required: ['product'],
    },
    execute: (args, catalog) => {
      const product = findProduct(catalog, str(args, 'product'))
      if (!product) return `Não achei "${str(args, 'product')}" no cardápio.`

      // A categoria dele precisa estar à vista, senão o destaque cai num
      // cartão que o filtro escondeu e nada acontece na tela.
      const ui = useMenuUi.getState()
      if (ui.categoryId && ui.categoryId !== product.categoryId) ui.openCategory(null)
      if (ui.filter !== 'all') ui.setFilter('all')
      ui.highlight(product.id)

      return `Apontei para ${product.name} (R$ ${(product.priceCents / 100).toFixed(2)}${
        product.soldOut ? ', ESGOTADO' : ''
      }). Fale dele agora; o destaque some sozinho.`
    },
  },

  {
    name: 'search_menu',
    description:
      'Procura pratos no cardápio por nome, descrição ou ingrediente. Use para responder dúvidas ("tem algo sem carne?", "o que vem na costela?") antes de afirmar qualquer coisa.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'O que procurar' } },
      required: ['query'],
    },
    execute: (args, catalog) => {
      const needle = norm(str(args, 'query'))
      const hits = catalog.products.filter(
        (p) => norm(p.name).includes(needle) || norm(p.description ?? '').includes(needle),
      )
      if (hits.length === 0) return `Nada no cardápio para "${str(args, 'query')}".`
      return JSON.stringify(
        hits.slice(0, 8).map((p) => ({
          nome: p.name,
          preco: p.priceCents / 100,
          descricao: p.description ?? null,
          esgotado: p.soldOut,
          personalizavel: p.modifierGroups.length > 0,
        })),
      )
    },
  },

  {
    name: 'open_category',
    description: 'Mostra uma categoria do cardápio na tela. Passe null para mostrar tudo.',
    parameters: {
      type: 'object',
      properties: { category: { type: 'string', description: 'Nome da categoria, ou vazio para todas' } },
    },
    execute: (args, catalog) => {
      const name = norm(str(args, 'category'))
      if (!name) {
        useMenuUi.getState().openCategory(null)
        return 'Mostrando o cardápio inteiro.'
      }
      const category = catalog.categories.find((c) => norm(c.name).includes(name))
      if (!category) return `Não existe a categoria "${str(args, 'category')}".`
      useMenuUi.getState().openCategory(category.id)
      return `Mostrando ${category.name}.`
    },
  },

  {
    name: 'open_product',
    description:
      'Abre um prato na tela para personalizar. Sempre use ANTES de escolher opções ou adicionar, para o cliente ver o que você entendeu.',
    parameters: {
      type: 'object',
      properties: { product: { type: 'string', description: 'Nome do prato' } },
      required: ['product'],
    },
    execute: (args, catalog) => {
      const product = findProduct(catalog, str(args, 'product'))
      if (!product) return `Não achei "${str(args, 'product')}" no cardápio.`
      if (product.soldOut) return `${product.name} está esgotado hoje.`
      useProductDraft.getState().open(product.id)
      // Abrir APAGA o destaque. São duas formas de dizer "é este", e as duas ao
      // mesmo tempo é o prato crescendo na grade enquanto um sheet sobe por
      // cima dele — o cliente vê dois movimentos e não sabe para onde olhar.
      useMenuUi.getState().highlight(null)
      useMenuUi.getState().setCartOpen(false)
      // Step aside. The customer asked to see a dish; a chat panel parked on
      // top of it is the waiter blocking the plate they just brought.
      useWaiter.getState().setExpanded(false)
      const groups = product.modifierGroups.map((g) => ({
        grupo: g.name,
        obrigatorio: g.required,
        escolhe_ate: g.maxSelections,
        opcoes: g.modifiers.map((m) => ({ nome: m.name, adicional: m.surchargeCents / 100 })),
      }))
      return JSON.stringify({ aberto: product.name, preco: product.priceCents / 100, grupos: groups })
    },
  },

  {
    name: 'choose_option',
    description:
      'Marca uma opção do prato aberto (ponto da carne, acompanhamento, adicional). Respeita o limite do grupo.',
    parameters: {
      type: 'object',
      properties: { option: { type: 'string', description: 'Nome da opção' } },
      required: ['option'],
    },
    execute: (args, catalog) => {
      const product = openProductOrNull(catalog)
      if (!product) return 'Nenhum prato está aberto. Use open_product primeiro.'
      const needle = norm(str(args, 'option'))
      for (const group of product.modifierGroups) {
        const modifier = group.modifiers.find((m) => norm(m.name).includes(needle))
        if (!modifier) continue
        useProductDraft.getState().toggle(group.id, modifier.id, group.maxSelections)
        const on = (useProductDraft.getState().chosen[group.id] ?? []).includes(modifier.id)
        return `${modifier.name} ${on ? 'marcado' : 'desmarcado'} em ${group.name}.`
      }
      return `"${str(args, 'option')}" não é uma opção de ${product.name}.`
    },
  },

  {
    name: 'set_quantity',
    description: 'Define quantas unidades do prato aberto.',
    parameters: {
      type: 'object',
      properties: { quantity: { type: 'number', description: 'De 1 a 99' } },
      required: ['quantity'],
    },
    execute: (args, catalog) => {
      const product = openProductOrNull(catalog)
      if (!product) return 'Nenhum prato está aberto.'
      useProductDraft.getState().setQuantity(num(args, 'quantity', 1))
      return `Quantidade: ${useProductDraft.getState().quantity}.`
    },
  },

  {
    name: 'add_to_order',
    description:
      'Adiciona o prato aberto ao pedido. Falha se ainda falta uma escolha obrigatória — nesse caso pergunte ao cliente o que ele prefere.',
    parameters: { type: 'object', properties: {} },
    execute: (_args, catalog) => {
      const product = openProductOrNull(catalog)
      if (!product) return 'Nenhum prato está aberto.'
      const { quantity, chosen } = useProductDraft.getState()
      const blocking = draftBlocking(product, chosen)
      // The same rule the button enforces. The waiter must not be able to put
      // an incomplete item in the kitchen's queue by talking around the UI.
      if (blocking) {
        return `Falta escolher ${blocking.groupName}. Opções: ${blocking.options.join(', ')}.`
      }
      useCart.getState().add(product, quantity, draftModifiers(product, chosen))
      useProductDraft.getState().close()
      return `${quantity}× ${product.name} no pedido.`
    },
  },

  {
    name: 'show_cart',
    description: 'Abre o carrinho para o cliente conferir o pedido.',
    parameters: { type: 'object', properties: {} },
    execute: () => {
      useProductDraft.getState().close()
      useMenuUi.getState().setCartOpen(true)
      useWaiter.getState().setExpanded(false)
      const lines = useCart.getState().lines
      if (lines.length === 0) return 'O carrinho está vazio.'
      return JSON.stringify(lines.map((l) => ({ item: l.product.name, qtd: l.quantity })))
    },
  },

  {
    name: 'change_line_quantity',
    description: 'Muda a quantidade de um item que já está no pedido. Zero remove.',
    parameters: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Nome do item no pedido' },
        quantity: { type: 'number' },
      },
      required: ['product', 'quantity'],
    },
    execute: (args) => {
      const needle = norm(str(args, 'product'))
      const line = useCart.getState().lines.find((l) => norm(l.product.name).includes(needle))
      if (!line) return `"${str(args, 'product')}" não está no pedido.`
      const quantity = num(args, 'quantity', line.quantity)
      useCart.getState().setQuantity(line.id, quantity)
      return quantity <= 0 ? `${line.product.name} removido.` : `${line.product.name}: ${quantity}.`
    },
  },

  {
    name: 'go_to_payment',
    description:
      'Leva o cliente até a tela de pagamento quando ele disser que terminou. Você NÃO paga — quem toca em pagar é sempre a pessoa.',
    parameters: { type: 'object', properties: {} },
    execute: () => {
      const lines = useCart.getState().lines
      if (lines.length === 0) return 'O pedido está vazio — não há o que pagar ainda.'
      useProductDraft.getState().close()
      useMenuUi.getState().setCartOpen(false)
      useWaiter.getState().setExpanded(false)
      useTotemSession.getState().goTo('payment')
      return 'Levei para o pagamento. O cliente escolhe a forma e toca em pagar.'
    },
  },
]

export function executeWaiterTool(
  name: string,
  args: Record<string, unknown>,
  catalog: TotemCatalog,
): string {
  const tool = WAITER_TOOLS.find((t) => t.name === name)
  if (!tool) return `Ferramenta desconhecida: ${name}`
  try {
    return tool.execute(args, catalog)
  } catch (error) {
    return `Erro em ${name}: ${error instanceof Error ? error.message : String(error)}`
  }
}
