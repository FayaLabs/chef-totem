import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// The bottom sheet. Product detail, cart, payment method — all of it.
//
// A sheet rather than a page because the customer must not lose their place in
// the menu: they are mid-decision, and a full-screen navigation makes "go back
// and compare" cost two taps and a scroll position.
//
// DRAG TO DISMISS. Everyone arrives at a kiosk carrying a phone's muscle
// memory, and on a phone a bottom sheet is dragged away. Making the panel obey
// the gesture people already try is worth more here than on a phone, because a
// customer who feels the panel "doesn't work" gives up in front of a queue
// instead of hunting for the close button.
//
// The scrim is heavy (60%) on purpose: it is what says the menu behind is
// inert. A light scrim on a bright food photo reads as decoration, and
// customers keep tapping the dish underneath.
// ---------------------------------------------------------------------------

/** Past this many pixels the sheet is going away; below it, it springs back. */
const DISMISS_AFTER = 140

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Rendered against the bottom edge, outside the scrollable body. */
  footer?: ReactNode
  /** Optional live preview, outside the scrolling choices just like the footer. */
  header?: ReactNode
  title?: string
  /** Accessible name when the visible heading lives in the bleed content. */
  ariaLabel?: string
  /**
   * Corpo sangrado: sem folga lateral e sem título no topo.
   *
   * Para o sheet cuja PRIMEIRA coisa é uma foto. Uma foto de comida com 6cqw
   * de branco em volta e um título acima dela é um cartão de catálogo; sangrada
   * até a borda, ela é o prato. A diferença é grande num painel de 27" onde a
   * foto é metade do argumento de venda.
   */
  bleed?: boolean
  children: ReactNode
  'data-testid'?: string
}

export function Sheet({ open, onClose, footer, header, title, ariaLabel, bleed = false, children, ...rest }: SheetProps) {
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)
  const body = useRef<HTMLDivElement>(null)
  /** Onde a folha começa, em px. Mede o quanto do véu alguém realmente vê. */
  const panel = useRef<HTMLDivElement>(null)
  const [panelTop, setPanelTop] = useState<number | null>(null)

  // A altura da folha é de conteúdo, então a faixa desfocada não pode ser um
  // número escrito à mão: ela é medida da própria folha, e remedida quando o
  // conteúdo muda de tamanho — um prato com sete grupos de modificador é uma
  // folha bem mais alta que um refrigerante.
  useEffect(() => {
    const node = panel.current
    if (!node) return
    const measure = () => setPanelTop(Math.round(node.getBoundingClientRect().top))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    setDrag(0)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Only start a drag when the body is already at the top. Otherwise a
    // customer scrolling a long modifier list would fling the sheet away
    // mid-read.
    // A fixed preview keeps the handle separate from scrolling choices, so it
    // can still dismiss the sheet even when those choices are scrolled down.
    if (!header && (body.current?.scrollTop ?? 0) > 0) return
    start.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    // Downward only: dragging up must not detach the sheet from its edge.
    setDrag(Math.max(0, event.clientY - start.current))
  }

  const onPointerUp = () => {
    if (start.current === null) return
    start.current = null
    if (drag > DISMISS_AFTER) onClose()
    else setDrag(0)
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end" data-sheet-open="">
      <button
        type="button"
        aria-label="Fechar"
        data-testid="sheet-scrim"
        onClick={onClose}
        // O scrim é o vidro mais barato do painel e o mais importante: uma
        // camada, tela inteira, e é ela que diz que o cardápio atrás está
        // inerte. O desfoque aqui NÃO é enfeite — sem ele o cliente continua
        // lendo os cartões de trás e continua tocando neles.
        // `contain: paint` prende o repinte ao próprio véu. Sem isso o
        // compositor trata a área desfocada como podendo afetar o que está
        // fora dela, e reamostra mais do que precisa a cada quadro da folha
        // subindo.
          className="absolute inset-0 bg-black/55"
        style={{ contain: 'paint', opacity: Math.max(0.35, 1 - drag / 400) }}
        />

        {/* O desfoque, recortado ao que aparece.

            Tinta e desfoque sao camadas separadas, e essa separacao e a
            diferenca entre 60 fps e 24: desfocar a viewport inteira derrubava
            a tela do item para 24-38 fps neste painel, medido. O que alguem
            ve do veu e so a faixa acima da folha — o resto esta debaixo de
            uma superficie branca opaca.

            `panelTop` vem medido da propria folha: a altura dela e de
            conteudo (`max-h-[86%]`), entao nao da para supor. Na primeira
            pintura, antes da medida, a faixa assume 20%. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 backdrop-blur-md backdrop-saturate-[0.7]"
          style={{
            height: panelTop ?? '20%',
            contain: 'paint',
            opacity: Math.max(0.35, 1 - drag / 400),
          }}
        />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        data-testid={rest['data-testid'] ?? 'sheet'}
        // O CORPO DO SHEET NÃO É DE VIDRO, e a tentação de fazê-lo é grande:
        // é a maior superfície do painel e a que mais pediria o efeito. Mas é
        // também onde mora o texto denso — descrição do prato, sete chips de
        // modificador, as linhas do carrinho — e vidro é exatamente o material
        // que se paga em superfície grande e se cobra em texto pequeno. Foto de
        // comida atravessando por trás de uma lista de preços é a definição de
        // ruído: passa em contraste e continua ilegível.
        //
        // O que ele ganha é a ARESTA de vidro: a quina de luz na borda de cima,
        // que é a única parte da peça que o cliente vê contra o scrim escuro, e
        // a que faz o sheet parecer subir por baixo da tela e não aparecer nela.
        className="relative flex max-h-[86%] flex-col overflow-hidden rounded-t-sheet bg-white shadow-[inset_0_0.2cqw_0_var(--glass-line),0_-0.6cqw_2cqw_rgba(11,11,12,0.35)] motion-safe:animate-[sheet-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          // No transition while the finger is down — the sheet must track it
          // exactly — and a spring back when it lifts.
          transition: start.current === null ? 'transform 220ms cubic-bezier(0.16,1,0.3,1)' : 'none',
        }}
      >
        {/* The grab area: the handle plus the title, so the whole top of the
            sheet is draggable rather than a 4px bar nobody can hit.

            Com a foto sangrada ele flutua sobre ela — mas só a FAIXA CENTRAL
            recebe toque. A primeira versão fazia a barra inteira interceptar, e
            o primeiro chip que rolasse para debaixo dela deixava de responder:
            o cliente tocava em "Média" e nada acontecia, sem nada na tela
            sugerindo por quê. */}
        <div
          className={[
            'shrink-0',
            bleed ? 'pointer-events-none absolute inset-x-0 top-0 z-10' : '',
          ].join(' ')}
        >
          <div
            data-testid="sheet-handle"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={[
              'pointer-events-auto cursor-grab touch-none pt-[2.2cqw]',
              // O PUXADOR NÃO GANHA VIDRO, e chegou a ganhar. Uma pastilha de
              // vidro em volta dele virou um retângulo cinza arredondado
              // boiando sobre a foto da pizza, com a barrinha branca dentro —
              // lê como defeito de renderização, não como controle. E come a
              // foto, que neste sheet é metade do argumento de venda.
              //
              // Vidro se paga onde há área e conteúdo por trás. Num traço de
              // 11cqw por 0,85cqw não há área nenhuma: só sobra o material, que
              // sem nada para revelar é sujeira em cima do prato.
              bleed ? 'mx-auto w-[30cqw] pb-[2.5cqw]' : '',
            ].join(' ')}
          >
            {/* O puxador do iOS. Ele existia a 40% de opacidade sobre a linha
                divisória e simplesmente não era visto — e um gesto que a pessoa
                não sabe que existe é um gesto que não existe. Agora é sólido: é
                a única coisa na tela que diz "isto desce". */}
            <span
              aria-hidden
              className={[
                'mx-auto block h-[0.85cqw] w-[11cqw] rounded-full',
                // Em cima de uma foto, cinza sobre cinza some. Branco com
                // sombra sobrevive tanto a um prato claro quanto a um mármore
                // escuro.
                bleed ? 'bg-white/85 shadow-[0_0_0.6cqw_rgba(0,0,0,0.35)]' : 'bg-ink/25',
              ].join(' ')}
            />
            {title ? (
              <h2
                className="px-[6cqw] pb-[2cqw] pt-[2.5cqw] text-center type-display"
                style={{ fontSize: 'var(--step-title)' }}
              >
                {title}
              </h2>
            ) : (
              <span className="block pb-[2cqw]" />
            )}
          </div>
        </div>

        {header ? <div className="shrink-0" data-testid="sheet-fixed-header">{header}</div> : null}

        <div
          ref={body}
          data-testid="sheet-body"
          className={[
            'min-h-0 flex-1 overflow-y-auto pb-[4cqw]',
            header ? 'overscroll-y-contain' : '',
            bleed ? 'px-0' : 'px-[6cqw]',
          ].join(' ')}
        >
          {children}
        </div>

        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>
  )
}
