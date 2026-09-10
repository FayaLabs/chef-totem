import { useEffect } from 'react'
import { MediaBackdrop } from '@/design'
import { totemConfig } from '@/config/totem.config'
import { prefetchCatalog } from '@/menu/useCatalog'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiter } from '@/waiter/useWaiter'
import { VoiceOrb } from '@/waiter/VoiceOrb'

// ---------------------------------------------------------------------------
// The resting state, and the only screen most passers-by ever see.
//
// The whole panel is the button. Nobody walking past a kiosk hunts for a target
// — they touch the screen. A "start" button that only works in one rectangle
// teaches the customer that the panel is broken.
//
// O ORBE ESTÁ AQUI porque é aqui que o cliente decide como vai pedir. Deixá-lo
// só no cardápio significa que a pessoa já escolheu o caminho de tocar antes de
// descobrir que dava para falar — e ninguém troca de caminho no meio. Ele fica
// ao lado do "toque para começar", não no lugar dele: falar é uma oferta, não
// um pedágio, e quem não quer falar não pode nem perceber que ele existe.
//
// Tocar no orbe entra na sessão E CHAMA O GARÇOM. Ele cumprimenta já no passo
// seguinte e conduz cada tela até o cardápio — antes ele só aparecia lá no
// cardápio, e quem tocava aqui atravessava duas telas em silêncio achando que
// o orbe era enfeite. A intenção viaja pelo store: ver `engaged`.
// ---------------------------------------------------------------------------

export function AttractScreen() {
  const start = useTotemSession((s) => s.start)
  const setEngaged = useWaiter((s) => s.setEngaged)
  // `off` = assistente desligado neste totem. Um orbe que não escuta é a pior
  // peça de interface possível: ele PARECE que escuta.
  const assistantOn = useWaiter((s) => s.phase) !== 'off'
  const { brand, media } = totemConfig

  // Sign the device in and pull the menu while nobody is waiting. By the time
  // the customer has chosen dine-in and skipped identification, it is there.
  useEffect(() => {
    void prefetchCatalog().catch(() => {
      // Surfaced by the menu screen with a retry; the attract loop stays quiet.
    })
  }, [])

  return (
    <button
      type="button"
      data-testid="attract"
      onClick={start}
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
    >
      <MediaBackdrop videoSrc={media.videoUrl} posterSrc={media.posterUrl} scrim={55} />

      <span
        className="relative z-10 font-display uppercase leading-[0.85] tracking-tight"
        style={{ fontSize: 'var(--step-hero)' }}
      >
        {brand.name}
      </span>
      <span
        className="relative z-10 mt-[2cqw] uppercase tracking-[0.4em] text-white/75"
        style={{ fontSize: 'var(--step-label)' }}
      >
        {brand.tagline}
      </span>

      {/* Pinned low: this is where a hand already is, and where the eye lands
          after the brand. The pulse is the only motion on the screen. */}
      <span
        className="absolute inset-x-0 z-10 flex flex-col items-center gap-[5cqw]"
        style={{ bottom: '9cqw' }}
      >
        <span
          className="rounded-full bg-action px-[7cqw] uppercase tracking-[0.2em] motion-safe:animate-[attract-pulse_2.4s_ease-in-out_infinite] grid place-items-center"
          style={{ fontSize: 'var(--step-body)', minHeight: 'var(--tap-bar)' }}
        >
          {totemConfig.copy.attractCta}
        </span>

        {assistantOn ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Começar falando com o assistente"
            data-testid="attract-orb"
            onClick={(event) => {
              // O painel inteiro é botão; sem parar aqui, o toque no orbe
              // dispara os dois e a intenção de falar some no mesmo quadro.
              event.stopPropagation()
              setEngaged(true)
              start()
            }}
            className="flex flex-col items-center gap-[2cqw]"
          >
            <span className="uppercase tracking-[0.3em] text-white/70" style={{ fontSize: 'var(--step-label)' }}>
              ou peça falando
            </span>
            <VoiceOrb size="20cqw" />
          </span>
        ) : null}
      </span>
    </button>
  )
}
