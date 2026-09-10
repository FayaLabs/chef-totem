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

// A BARRA NÃO É DE VIDRO, e chegou a ser por um dia.
//
// Ela é o compromisso — carrinho e finalizar — e compromisso é opaco, pela
// mesma razão já escrita no `TotemButton` sobre o tom `action`: o vidro é para
// o que sustenta a tela, não para o que cobra o cliente. Traduzir isso para a
// barra e não traduzir para o botão que mora dentro dela era enunciar a regra e
// quebrá-la no mesmo rodapé.
//
// E o caso dela é o PIOR caso de vidro que existe. O que passa por baixo é uma
// foto de comida que ROLA: o contraste do rótulo "Carrinho" muda a cada quadro
// enquanto o cliente rola o cardápio, o que nenhum piso de alpha conserta —
// piso garante o mínimo, não garante estabilidade. Em troca disso, o efeito
// oferecia ver o cardápio através da barra que serve exatamente para SAIR do
// cardápio.
//
// O vidro fica na faixa do garçom, logo acima: aquela é contexto, flutua sobre
// a grade, e ver o cardápio através dela é justamente o ponto.
//
// A DIVISA entre as duas é uma borda de `edge`, e não uma linha decorativa. As
// duas faixas são claras e encostadas, e sem um limite medido elas se fundem
// numa faixa só de 240px — a mesma armadilha da borda de controle vazado, e a
// mesma solução: `edge` tem 3:1 garantido contra a página (WCAG 1.4.11).
export function BottomBar({ children }: { children?: ReactNode }) {
  return (
    <div
      data-testid="bottom-bar"
      // A sombra sobe, e não desce: para baixo daqui é fora da tela — a barra
      // encosta na borda inferior do painel. O que precisa de sombra é a aresta
      // de cima, contra a grade que passa por baixo dela.
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch border-t-2 border-edge bg-surface shadow-[0_-0.3cqw_1.2cqw_rgba(11,11,12,0.12)]"
      style={{ minHeight: 'var(--tap-bar)' }}
    >
      <div className="flex min-w-0 flex-1 items-stretch">{children}</div>
    </div>
  )
}
