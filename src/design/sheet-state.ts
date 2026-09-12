import { useEffect } from 'react'
import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Há uma folha aberta? — a pergunta, respondida em UM lugar.
//
// O CSS já sabia disso por conta própria (`body:has([data-sheet-open])`), e foi
// o bastante enquanto a única consequência era mover a faixa do garçom para o
// topo. Deixou de ser no instante em que a resposta mudou COMPORTAMENTO: com a
// faixa no topo a seta tem de apontar para baixo, e as aberturas de conversa
// não têm por que aparecer — o cliente já está escolhendo o ponto da carne.
//
// Um seletor de CSS não consegue trocar um ícone nem deixar de renderizar um
// botão, e o React não enxerga `:has()`. Então a folha passa a DIZER que está
// aberta, e quem precisa saber pergunta aqui — inclusive o CSS, que agora
// escuta o mesmo fato pelo `data-anchor` da faixa.
//
// É uma CONTAGEM, não um booleano: o carrinho abre por cima do prato, e a
// primeira folha a fechar não pode dizer que não há mais nenhuma.
// ---------------------------------------------------------------------------

interface SheetStackState {
  open: number
  push: () => void
  pop: () => void
}

const useSheetStack = create<SheetStackState>((set) => ({
  open: 0,
  push: () => set((state) => ({ open: state.open + 1 })),
  pop: () => set((state) => ({ open: Math.max(0, state.open - 1) })),
}))

/** Chamado pela própria folha enquanto ela existe. */
export function useRegisterSheet(open: boolean): void {
  const push = useSheetStack((s) => s.push)
  const pop = useSheetStack((s) => s.pop)
  useEffect(() => {
    if (!open) return
    push()
    return pop
  }, [open, push, pop])
}

/** Alguma folha está aberta agora. */
export function useSheetOpen(): boolean {
  return useSheetStack((s) => s.open > 0)
}
