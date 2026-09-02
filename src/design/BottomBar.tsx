import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The persistent bottom edge: a ação da tela, ocupando a linha inteira.
//
// Já morou um controle redondo aqui à esquerda — primeiro o modo alcance,
// depois o orbe do assistente. Os dois saíram pelo mesmo motivo: um círculo
// solto no canto de uma barra de commit não pertence a nada. O orbe agora vive
// na faixa do garçom, colado na frase que ele está dizendo, que é onde o olho
// já estava. O modo alcance está fora por ora (ver DESIGN.md).
//
// A barra existe porque o controle solto FLUTUAVA sobre o conteúdo. Num painel
// cujo meio rola, um controle flutuante sempre acaba em cima de alguma coisa —
// e um botão escondido debaixo de outro botão é o pior tipo de defeito, porque
// nada nele parece errado.
// ---------------------------------------------------------------------------

export function BottomBar({ children }: { children?: ReactNode }) {
  return (
    <div
      data-testid="bottom-bar"
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch border-t border-white/60 bg-white/75 backdrop-blur-2xl"
      style={{ minHeight: 'var(--tap-bar)' }}
    >
      <div className="flex min-w-0 flex-1 items-stretch">{children}</div>
    </div>
  )
}
