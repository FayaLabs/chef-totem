import { useCallback, useRef } from 'react'
import type { TotemModifierGroup } from '@/menu/types'

// ---------------------------------------------------------------------------
// A escolha empurra a tela para a próxima etapa.
//
// O sheet de um burger tem sete grupos. Quem termina "Ponto da carne" e vê a
// tela parada não sabe que existe mais coisa embaixo — e num totem ninguém
// rola por curiosidade com fila atrás. O app de delivery que todo mundo já
// usou resolve isso descendo sozinho: terminou a etapa, a próxima sobe para o
// topo da área de leitura.
//
// Regra de quando descer: só quando o grupo ENCHEU (`count >= max`). Um grupo
// de adicionais com três vagas não pode fugir do dedo no primeiro toque — o
// cliente ainda está escolhendo ali. Um grupo de escolha única enche no
// primeiro toque, que é exatamente o caso de "ponto da carne".
//
// Descer não é decidir: o cliente pode subir e mexer em qualquer etapa. Isto é
// rolagem, nunca um wizard que tranca a etapa anterior.
// ---------------------------------------------------------------------------

export interface Step {
  id: string
  done: boolean
}

/** Quantas escolhas o grupo ainda exige para contar como resolvido. */
export function stepMinimum(group: TotemModifierGroup): number {
  return group.required ? Math.max(1, group.minSelections) : 0
}

/** Etapa cumprida: o obrigatório atingiu o mínimo, o opcional sempre está. */
export function stepDone(group: TotemModifierGroup, chosen: Record<string, string[]>): boolean {
  return (chosen[group.id] ?? []).length >= stepMinimum(group)
}

/**
 * Etapa com algo dentro — é isto que o número vira ✓.
 *
 * Não é a mesma pergunta de `stepDone`: um grupo opcional já nasce cumprido
 * para o fluxo (ele nunca trava o pedido), mas mostrar ✓ num grupo em que o
 * cliente não tocou é dizer que ele escolheu algo que não escolheu.
 */
export function stepFilled(group: TotemModifierGroup, chosen: Record<string, string[]>): boolean {
  return (chosen[group.id] ?? []).length >= Math.max(1, stepMinimum(group))
}

/** Etapa cheia: não cabe mais escolha, então é hora de sair dela. */
export function stepFull(group: TotemModifierGroup, chosen: Record<string, string[]>): boolean {
  return (chosen[group.id] ?? []).length >= group.maxSelections
}

function scrollTo(element: HTMLElement, top: number, smooth: boolean) {
  // jsdom não implementa scrollTo; o fallback mantém o teste honesto sobre
  // onde a lista parou em vez de estourar.
  if (typeof element.scrollTo === 'function') element.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
  else element.scrollTop = top
}

/** Leva a etapa para o topo da área de leitura do sheet. */
export function scrollToStep(id: string | null) {
  const body = document.querySelector<HTMLElement>('[data-testid="sheet-body"]')
  if (!body) return
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!id) {
    scrollTo(body, body.scrollHeight, smooth)
    return
  }
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id
  const step = body.querySelector<HTMLElement>(`[data-step="${escaped}"]`)
  if (!step) return
  // Uma folga pequena acima do título: encostado na borda ele lê como texto
  // cortado pelo topo, não como começo de etapa.
  const top = step.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - body.clientWidth * 0.02
  scrollTo(body, Math.max(0, top), smooth)
}

/** Leva a etapa para o topo no PRÓXIMO quadro — para quem acabou de mudar a
 * tela e ainda não tem o novo layout medido. */
export function scrollToStepSoon(id: string): void {
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToStep(id)))
}

/**
 * Devolve `advance(fromId)`: desce para a primeira etapa ainda aberta depois
 * de `fromId`, ou para o fim da lista quando não sobrou nenhuma.
 *
 * O array chega novo a cada render; o ref é o que garante que o `advance`
 * chamado dentro do onClick enxergue o estado DEPOIS do toque, e não o de
 * antes. Os dois frames esperam o React pintar — medir posição antes disso
 * mede a tela velha.
 */
export function useStepFlow(steps: Step[]) {
  const latest = useRef(steps)
  latest.current = steps
  return useCallback((fromId: string) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const list = latest.current
      const from = list.findIndex((step) => step.id === fromId)
      if (from < 0) return
      scrollToStep(list.slice(from + 1).find((step) => !step.done)?.id ?? null)
    }))
  }, [])
}
