import { useEffect, useState } from 'react'
import { MediaBackdrop } from '@/design'
import { totemConfig } from '@/config/totem.config'
import { prefetchCatalog } from '@/menu/useCatalog'
import { useTotemSession } from '@/session/useTotemSession'
import { useWaiter } from '@/waiter/useWaiter'
import { VoiceOrb } from '@/waiter/VoiceOrb'
import { useTenantBrand } from '@/config/tenant-brand'

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
  const { brand, media, theme } = totemConfig
  // Uma logo que não carrega tem de cair no NOME, não num buraco. Mesma regra
  // da foto do prato caindo no ícone de talheres: rede de segurança, não plano.
  const [logoBroken, setLogoBroken] = useState(false)
  // O nome vem do tenant, não de `brand.name` — este só tem resposta real no
  // modo demo, e um painel live caía num 'Chef' fixo.
  const name = useTenantBrand()

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

      {/* A marca aparece UMA vez.

          Com a logo no ar, o nome tipografado sai — não fica ao lado dela. Os
          dois juntos são a mesma marca dita duas vezes, e a segunda vez sempre
          contradiz a primeira: a logo já decidiu peso, caixa e espacejamento, e
          o `type-display` decide tudo isso de novo com outros valores.

          O `alt` é o nome da casa de propósito: uma logo que não carrega tem de
          continuar dizendo onde a pessoa está, e um leitor de tela nunca soube
          ler um desenho. */}
      {theme?.logoUrl && !logoBroken ? (
        <img
          src={theme.logoUrl}
          alt={name}
          data-testid="brand-logo"
          onError={() => setLogoBroken(true)}
          className="relative z-10 block"
          // Largura, não altura: um wordmark é uma faixa horizontal, e travar a
          // altura faria uma logo larga sangrar pelas laterais do painel. O teto
          // de altura existe para o caso oposto — um emblema alto e estreito.
          style={{ width: '62cqw', maxHeight: '34cqw', objectFit: 'contain' }}
        />
      ) : (
        <span
          className="relative z-10 type-display leading-[0.85] tracking-tight"
          style={{ fontSize: 'var(--step-hero)' }}
        >
          {name}
        </span>
      )}
      <span
        className="relative z-10 mt-[2cqw] uppercase tracking-[0.4em] text-white/75"
        style={{ fontSize: 'var(--step-label)' }}
      >
        {brand.tagline}
      </span>

      {/* Pinned low: this is where a hand already is, and where the eye lands
          after the brand. The pulse is the only motion on the screen.

          OS DOIS CAMINHOS FICAM LADO A LADO, e não um embaixo do outro. Empilhado,
          o orbe lia como o passo SEGUINTE ao botão — a pessoa lê de cima para
          baixo e conclui que primeiro se toca, depois se fala. Na mesma linha
          eles são o que realmente são: duas portas para a mesma sala, e a
          escolha é de quem chegou.

          O botão continua à esquerda porque tocar é o caminho que todo mundo
          conhece; falar é a oferta. Uma oferta fica ao lado, nunca na frente. */}
      <span
        className="absolute inset-x-0 z-10 flex items-center justify-center gap-[4cqw] px-[5cqw]"
        style={{ bottom: '9cqw' }}
      >
        <span
          // `text-on-action` e não o branco herdado do painel: a marca em volta
          // está sobre foto escura, mas esta pílula está sobre a COR DE AÇÃO, e
          // numa casa de marca clara o branco herdado deixava a única chamada
          // da tela em 1,7:1.
          className="shrink-0 rounded-full bg-action px-[7cqw] text-center uppercase tracking-[0.2em] text-on-action motion-safe:animate-[attract-pulse_2.4s_ease-in-out_infinite] grid place-items-center"
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
            className="flex shrink-0 flex-col items-center gap-[1.5cqw]"
          >
            <span
              className="whitespace-nowrap uppercase tracking-[0.3em] text-white/70"
              style={{ fontSize: 'var(--step-label)' }}
            >
              ou peça falando
            </span>
            {/* Encolheu de 20cqw para 13cqw ao vir para a linha do botão. Do
                tamanho antigo ele era maior que a própria chamada e a tela
                passava a ter dois protagonistas; aqui ele é um par do botão, e
                ainda tem 140px no painel — bem acima do piso de toque. */}
            <VoiceOrb size="13cqw" />
          </span>
        ) : null}
      </span>
    </button>
  )
}
