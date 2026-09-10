import { Store, ShoppingBag } from 'lucide-react'
import { GlassWarp, MediaBackdrop } from '@/design'
import { totemConfig } from '@/config/totem.config'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiterDockInset } from '@/waiter/presence'

// ---------------------------------------------------------------------------
// Eat here or take it away — asked first because it can change the price (and,
// in Brazil, the tax) of everything that follows.
//
// Two options and nothing else on the screen. Every extra control here is a
// decision taken in front of a queue.
// ---------------------------------------------------------------------------

export function ModeScreen() {
  const chooseMode = useTotemSession((s) => s.chooseMode)
  const ticket = useTotemSession((s) => s.ticket)
  const { media } = totemConfig
  // Esta tela não tem barra de baixo: a faixa do garçom, quando ele foi
  // chamado, encosta no rodapé e os dois cartões sobem para não ficar debaixo
  // dela. Sem isto, o "levar" fica com a metade de baixo escondida.
  const dock = useWaiterDockInset()

  return (
    <div data-testid="screen-mode" className="absolute inset-0 flex flex-col justify-end text-white">
      {/* O scrim caiu de 60 para 44 no dia em que os cartões viraram vidro, e a
          conta é direta: os dois escureciam a MESMA foto, um em cima do outro.
          O resultado era um forno preto atrás de duas panes cinzas — o efeito
          cobrava exatamente a coisa que ele existe para mostrar.
          Quem segura o rótulo agora é o `glass-plate` do cartão, que tem alpha
          calculado; o scrim voltou a fazer só o trabalho dele, que é o título
          branco sobre a foto crua.
          O NÚMERO É MEDIDO, não escolhido. `.evidence/glass-contrast.mjs` apaga
          a tinta, fotografa o que passa por trás de cada glifo e devolve o pior
          pixel da caixa nas três casas. A 34 a cafeteria reprovava (3,84:1 — o
          pôster dela é o mais claro dos três); a 40 passa raspando em 4,72; a
          44 fica em 5,44:1 e é onde parei. Mexer aqui sem rodar aquele script é
          mexer no contraste do painel no escuro. */}
      <MediaBackdrop videoSrc={media.videoUrl} posterSrc={media.posterUrl} scrim={44} />

      <div className="relative z-10 px-[6cqw]" style={{ paddingBottom: `calc(${dock} + 10cqw)` }}>
        <h1
          className="mb-[6cqw] text-center type-display leading-[0.9] tracking-tight"
          style={{ fontSize: 'var(--step-display)' }}
        >
          {totemConfig.copy.modeTitle}
        </h1>

        <div className="grid grid-cols-2 gap-[4cqw]">
          <ModeCard
            testId="mode-dine-in"
            label={totemConfig.copy.modeHere}
            icon={<Store strokeWidth={2} className="size-[9cqw]" />}
            onClick={() => chooseMode('dine_in')}
          />
          <ModeCard
            testId="mode-takeaway"
            label={totemConfig.copy.modeAway}
            icon={<ShoppingBag strokeWidth={2} className="size-[9cqw]" />}
            onClick={() => chooseMode('takeaway')}
          />
        </div>

        {ticket ? (
          <p
            className="tnum mt-[6cqw] text-center uppercase tracking-[0.3em] text-white/60"
            style={{ fontSize: 'var(--step-label)' }}
          >
            senha {ticket}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ModeCard({
  testId,
  label,
  icon,
  onClick,
}: {
  testId: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      // Tall on purpose: these two are the whole screen, so they should read as
      // a choice between two places, not two list items.
      //
      // E SÃO DE VIDRO, que é a única tela do painel onde isso não é escolha
      // estética. Estes dois cartões moram sobre o vídeo da casa, e eram dois
      // retângulos brancos opacos: legíveis, e tapando com papel exatamente a
      // metade de baixo da comida que trouxe o cliente até aqui. Um cartão que
      // deixa o forno passar por trás vende a casa e continua sendo um botão.
      //
      // ABERTOS, e a primeira versão errou justamente isto. Com o piso de
      // legibilidade no corpo inteiro da pane, os dois viraram blocos foscos —
      // e quem olhou disse "mudou a cor dos cards", que é exatamente o que
      // tinha acontecido. O piso não fazia falta em lugar nenhum a não ser
      // embaixo do rótulo; no resto da peça ele só cobrava a foto.
      //
      // Então a peça é `glass-open` (fina, a comida atravessa) e o RÓTULO leva
      // o próprio fundo (`glass-plate`, com o alpha calculado contra um prato
      // estourado de luz — ver `glassOf`). O piso anda com o texto, não com o
      // cartão: assim um vídeo novo no lugar deste não pode quebrar a tela, e
      // mudar a altura do cartão não move a garantia de lugar.
      className="press relative flex min-h-[38cqw] flex-col items-stretch justify-end overflow-hidden rounded-totem glass-media glass-open has-warp"
    >
      <GlassWarp />
      <span className="flex flex-1 items-center justify-center pt-[4cqw]">{icon}</span>
      <span
        className="glass-plate w-full pb-[3.5cqw] pt-[9cqw] text-center font-semibold uppercase tracking-[0.16em]"
        style={{ fontSize: 'var(--step-body)' }}
      >
        {label}
      </span>
    </button>
  )
}
