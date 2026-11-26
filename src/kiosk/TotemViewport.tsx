import { useState, type CSSProperties, type ReactNode } from 'react'
import { TOTEM_RELEASE } from '@/config/totem.config'
import { activeHouseLabel, ServicePanel } from '@/demo/TenantSwitcher'
import { GlassDefs } from '@/design/Glass'
import { REACH_INSET_RATIO, useReachMode } from '@/design/useReachMode'
import { useTotemSession } from '@/session/useTotemSession'

// ---------------------------------------------------------------------------
// The 9:16 stage.
//
// The panel is 1080x1920, but a dev laptop is not, and the next store's panel
// may not be either. Rather than hardcode pixels, the app renders into a box
// that keeps 9:16 and centres itself — so a 1080x1920 screenshot and a glance
// on a 16:10 laptop show the same composition, and every `cqw` token stays
// proportional because it resolves against this box, not the window.
//
// OUTSIDE THE SHELL, THE STAGE FILLS THE SCREEN. A browser on a tablet is not a
// preview of the panel, it is the device someone is using: a 9:16 box on an
// iPad wastes a quarter of the glass to black bars. So in a browser the stage
// takes the whole height and as much width as a portrait composition can hold
// (up to 3:4); only a landscape screen keeps side bars. Inside the Electron
// shell nothing changes: the panel still gets the exact 9:16 box.
//
// The size is measured against the fixed wrapper as a size container (`cqw` /
// `cqh` of the WRAPPER, since a container's own size resolves against its
// ancestor), not `dvh`/`dvw`. iPad Safari is where the viewport units and the
// visible area disagree, and the wrapper is the visible area by definition.
//
// Reach mode surrenders the top of the stage rather than scaling the UI down:
// the content area shrinks and scrolls, and every tap target keeps its physical
// size. Shrinking would make the panel harder to hit for the exact person who
// asked for help reaching it.
// ---------------------------------------------------------------------------

/** True inside the Electron shell (see electron/preload.cjs). */
export function inShell(): boolean {
  return typeof window !== 'undefined' && window.fayzShell?.isShell === true
}

/**
 * The stage box, in `cqw`/`cqh` of the full-screen wrapper.
 *
 * Panel: exactly 9:16, letterboxed. Screen: full height, width up to 3:4 —
 * wider than that the portrait composition stretches past what it was drawn
 * for, so a landscape screen keeps side bars.
 */
export function stageSize(panel: boolean): CSSProperties {
  return panel
    ? { width: 'min(100cqw, calc(100cqh * 9 / 16))', height: 'min(100cqh, calc(100cqw * 16 / 9))' }
    : { width: 'min(100cqw, calc(100cqh * 3 / 4))', height: '100cqh' }
}

export function TotemViewport({ children }: { children: ReactNode }) {
  const reach = useReachMode((s) => s.enabled)
  const [service, setService] = useState(false)
  const house = activeHouseLabel()
  // Só no repouso. Ver o comentário da etiqueta.
  const atRest = useTotemSession((s) => s.step) === 'attract'

  return (
    <div className="fixed inset-0 grid place-items-center bg-black" style={{ containerType: 'size' }}>
      <div
        data-totem-stage
        data-reach={reach ? 'on' : 'off'}
        data-fit={inShell() ? 'panel' : 'screen'}
        className="relative overflow-hidden bg-ink"
        style={{ ...stageSize(inShell()), containerType: 'size' }}
      >
        {/* Os `defs` do vidro moram no palco, uma vez só: um `<filter>` por
            peça seria um `id` repetido, e `id` repetido é a classe de bug em
            que metade das panes refrata e a outra metade não conforme a ordem
            de montagem. Ver design/Glass.tsx. */}
        <GlassDefs />

        <div
          data-totem-content
          className="absolute inset-x-0 bottom-0 overflow-hidden transition-[top] duration-300 ease-out"
          style={{ top: reach ? `${REACH_INSET_RATIO * 100}%` : '0' }}
        >
          {children}
        </div>

        {/* Qual build está no vidro, e em qual casa — SÓ NO REPOUSO.
            E ela é o BOTÃO do painel de serviço.

            Ela acompanhava todas as telas, porque quem precisa dela costuma
            precisar no momento em que a coisa deu errado, e isso raramente é no
            repouso. O argumento estava certo e perdeu para um mais forte: no
            cardápio, na identificação e no pagamento, o topo é a parte da tela
            que o cliente lê primeiro, e um rótulo de suporte ali cobra espaço de
            TODO cliente para servir um operador três vezes por feira.

            No repouso o espaço é de graça — a tela está parada, mostrando um
            pôster — e é onde o operador vai olhar de qualquer jeito quando
            alguém perguntar "dá pra ver o de hambúrguer?". O custo real é ter de
            voltar ao repouso para ler o modo do cardápio, e voltar ao repouso é
            um toque em CANCELAR.

            Fica na STAGE e não dentro do conteúdo porque o conteúdo desce no
            modo de alcance, e um rótulo de suporte que descesse junto pousaria
            no meio da tela. Canto de cima, porque o de baixo é do garçom e das
            barras de ação. O chip é o que a torna legível tanto sobre um pôster
            escuro quanto sobre um formulário quase branco.

            O alvo é `var(--tap)` de altura e cresce PARA BAIXO a partir da
            etiqueta, para dentro do topo do pôster, onde ninguém toca. O painel
            inteiro continua sendo o botão de começar (ver AttractScreen); o que
            se perde é um canto de 88px no alto de 1920, longe de qualquer mão
            que só quer comprar. */}
        {atRest ? (
          <>
          <button
            type="button"
            data-testid="totem-release"
            aria-label="Painel de serviço"
            onClick={() => setService(true)}
            className="absolute right-0 top-0 z-50 flex select-none items-start justify-end pr-[2cqw] pt-[1.5cqw]"
            // Largo o bastante para o chip nunca quebrar em duas linhas: com a
            // casa E a build na mesma etiqueta, o texto passa de 260px e um alvo
            // estreito o dobrava em três linhas com o ponto esticado no meio.
            style={{ minHeight: 'var(--tap)', width: 'calc(var(--tap) * 6)' }}
          >
            <span className="flex items-center gap-[1.2cqw] whitespace-nowrap rounded-full bg-black/25 px-[1.5cqw] py-[0.5cqw] uppercase tracking-[0.2em] text-white/70"
              style={{ fontSize: 'var(--step-label)' }}
            >
              {/* A cor da casa. É o que responde "em qual estou?" de longe, sem
                  ler — e numa feira essa é a pergunta mais frequente. */}
              <span
                aria-hidden
                className="block shrink-0 rounded-full"
                style={{ width: '1.1cqw', height: '1.1cqw', backgroundColor: house.colour }}
              />
              {house.name} · {TOTEM_RELEASE}
            </span>
          </button>

          <ServicePanel open={service} onClose={() => setService(false)} />
          </>
        ) : null}
      </div>
    </div>
  )
}
