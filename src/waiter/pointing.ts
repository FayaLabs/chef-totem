import { useCart } from '@/cart/useCart'
import { catalogNow } from '@/menu/useCatalog'
import { useMenuUi } from '@/menu/useMenuUi'
import { useProductDraft } from '@/menu/useProductDraft'
import { useTotemSession } from '@/session/useTotemSession'
import type { TotemCatalog, TotemProduct } from '@/menu/types'

// ---------------------------------------------------------------------------
// O garçom APONTA para o prato de que está falando.
//
// Ele já tem a ferramenta (`highlight_product`) e a instrução de usá-la — e
// mesmo assim ela fica de fora metade das vezes, porque chamar ferramenta é
// uma decisão e falar é outra. O custo do esquecimento é alto: o cliente ouve
// "o Cheddar Bacon vem com bacon e cebola crispy" olhando para uma grade de
// dez cartões iguais, sem saber qual é o Cheddar Bacon. Um garçom de verdade
// aponta com a mão enquanto diz o nome; é gesto, não decisão.
//
// Então isto não substitui a ferramenta, faz o piso dela: se a fala nomeia UM
// prato e a tela não está fazendo nada melhor, o cartão acende.
//
// TRÊS GUARDAS, e cada uma responde a "isso ainda é olhar?":
//  - fora do cardápio não há grade para acender;
//  - com um prato ABERTO o cliente já passou de olhar para escolher, e acender
//    um cartão atrás do sheet é mexer numa tela que ninguém está vendo;
//  - o que já está no carrinho não é mais vitrine: o cliente manifestou o
//    desejo, e apontar de novo é oferecer o que ele já levou.
// ---------------------------------------------------------------------------

/**
 * APONTAR ESTÁ DESLIGADO — decisão de feira, 11/09/2026.
 *
 * O gesto atropelava o cliente em vez de ajudá-lo. O painel do evento abre um
 * prato assim que entra no cardápio, e o garçom, no meio da primeira fala,
 * saía recomendando: acendia cartão, e para acender trocava a categoria e
 * limpava o filtro — mexendo numa grade que está ATRÁS de um sheet, que o
 * cliente não está vendo e não pediu para mexer. O cliente abre um item, e a
 * tela por baixo dele muda sozinha.
 *
 * Desligado num lugar só, e nos três lugares que dependem disso: a ferramenta
 * sai da lista que o modelo enxerga, a instrução de apontar sai do prompt, e
 * este piso automático para de acender. O código fica de pé para voltar — o
 * que precisa mudar antes é a REGRA de quando apontar, não o mecanismo.
 */
export const POINTING_ENABLED = false

const norm = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/**
 * Os pratos do cardápio citados numa fala.
 *
 * Nomes de menos de três letras ficam de fora: um prato chamado "OK" casaria
 * com metade das frases do garçom.
 */
export function spokenProducts(text: string, catalog: TotemCatalog): TotemProduct[] {
  const said = norm(text)
  return catalog.products.filter((product) => product.name.trim().length >= 3 && said.includes(norm(product.name)))
}

/**
 * Acende o cartão do prato citado, se for possível saber QUAL.
 *
 * Dois pratos na mesma frase é comparação ("o Clássico é mais leve que o
 * Duplo"), e comparação apontando para um só apaga justamente o outro lado da
 * comparação. Nesse caso a tela fica quieta e quem decide é a ferramenta.
 */
export function pointWhileSpeaking(text: string): void {
  if (!POINTING_ENABLED) return
  const catalog = catalogNow()
  if (!catalog || !text.trim()) return
  if (useTotemSession.getState().step !== 'menu') return
  if (useProductDraft.getState().productId) return

  const named = spokenProducts(text, catalog)
  if (named.length !== 1) return
  const [product] = named
  if (useCart.getState().lines.some((line) => line.product.id === product.id)) return

  const ui = useMenuUi.getState()
  if (ui.highlightId === product.id) return
  // O cartão precisa estar à vista: um destaque num prato que o filtro escondeu
  // é um gesto para uma parede.
  if (ui.categoryId && ui.categoryId !== product.categoryId) ui.openCategory(null)
  if (ui.filter !== 'all') ui.setFilter('all')
  ui.highlight(product.id)
}
