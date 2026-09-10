import { useEffect, useState } from 'react'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import {
  BottomBar,
  ReachModeToggle,
  Chip,
  GlassWarp,
  NumericKeypad,
  Sheet,
  Stepper,
  TotemButton,
  useReachMode,
} from '@/design'

// Internal only. Reached with `?design` — every primitive on one page, so a
// change to a token is visible everywhere it lands before it ships, and so the
// screenshot spec has one surface to diff instead of six screens.
export function DesignCatalog() {
  const [qty, setQty] = useState(2)
  const [picked, setPicked] = useState('promo')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [digits, setDigits] = useState('11987')
  const reach = useReachMode((s) => s.enabled)

  return (
    <div
      data-testid="design-catalog"
      // pb reserves the bottom bar so no content ever scrolls under it.
      className="size-full overflow-y-auto surface-page px-[5cqw] pt-[5cqw] pb-[calc(var(--tap-bar)+5cqw)]"
    >
      <header className="mb-[5cqw]">
        <h1 className="type-display leading-[0.9]" style={{ fontSize: 'var(--step-display)' }}>
          Design do totem
        </h1>
        <p className="mt-[1cqw] uppercase tracking-[0.3em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
          alcance {reach ? 'baixo' : 'normal'}
        </p>
      </header>

      <Section title="Botões">
        <div className="flex flex-col gap-[2cqw]">
          <TotemButton tone="action" size="base" data-testid="btn-action">
            Adicionar ao pedido <ArrowRight strokeWidth={3} className="size-[2.4cqw]" />
          </TotemButton>
          <TotemButton tone="ink" size="base" data-testid="btn-ink">Comer aqui</TotemButton>
          <TotemButton tone="quiet" size="base" data-testid="btn-quiet">Continuar sem me identificar</TotemButton>
          <TotemButton tone="action" size="base" disabled>Escolha um tamanho primeiro</TotemButton>
        </div>
      </Section>

      <Section title="Chips">
        <div className="grid grid-cols-2 gap-[2cqw]">
          <Chip selected={picked === 'todos'} onClick={() => setPicked('todos')}>Todos</Chip>
          <Chip selected={picked === 'promo'} onClick={() => setPicked('promo')}>Promo</Chip>
          <Chip surchargeCents={150} onClick={() => undefined}>Borda recheada</Chip>
          <Chip selected surchargeCents={200} onClick={() => undefined}>Frango extra</Chip>
        </div>
      </Section>

      <Section title="Stepper">
        <Stepper value={qty} onChange={setQty} />
      </Section>

      <Section title="Teclado">
        <p className="tnum mb-[2cqw] font-bold" style={{ fontSize: 'var(--step-title)' }}>
          {digits || '—'}
        </p>
        <NumericKeypad
          onDigit={(d) => setDigits((v) => (v.length < 11 ? v + d : v))}
          onBackspace={() => setDigits((v) => v.slice(0, -1))}
        />
      </Section>

      {/* O VIDRO, em uma tela. O catálogo é onde uma mudança de token aparece
          antes de chegar às seis telas, e o material é o token que mais
          superfície ocupa hoje: se ele estiver leitoso, opaco ou tingido demais,
          é aqui que se vê primeiro, com as três densidades lado a lado.

          A pane sobre foto vem sobre uma FOTO de verdade — sem ela, o vidro
          escuro seria um retângulo cinza e a única coisa que ele existe para
          provar (que o fundo atravessa) não estaria na tela. */}
      <Section title="Vidro">
        <div className="flex flex-col gap-[2cqw]">
          <div className="glass grid min-h-[var(--tap)] place-items-center rounded-totem" data-testid="glass-pane">
            <span className="uppercase tracking-[0.2em]" style={{ fontSize: 'var(--step-label)' }}>
              pane · sobre a página, sem desfoque
            </span>
          </div>

          <div className="relative h-[34cqw] overflow-hidden rounded-totem bg-ink">
            <img src="/demo/pizza-house/margherita.jpg" alt="" className="size-full object-cover" />
            <div className="absolute inset-x-[3cqw] bottom-[3cqw] flex gap-[2cqw]">
              <span
                data-testid="glass-media"
                className="glass-media grid min-h-[var(--tap)] flex-1 place-items-center rounded-totem px-[2cqw] text-center uppercase tracking-[0.2em]"
                style={{ fontSize: 'var(--step-label)' }}
              >
                densa
              </span>
              <span
                data-testid="glass-open"
                className="glass-media glass-open has-warp relative grid min-h-[var(--tap)] flex-1 place-items-end overflow-hidden rounded-totem"
              >
                <GlassWarp />
                <span
                  className="glass-plate w-full pb-[1.4cqw] pt-[3cqw] text-center uppercase tracking-[0.2em]"
                  style={{ fontSize: 'var(--step-label)' }}
                >
                  aberta · com refração
                </span>
              </span>
            </div>
          </div>

          <div className="glass-live grid min-h-[var(--tap)] place-items-center rounded-totem" data-testid="glass-live">
            <span className="uppercase tracking-[0.2em]" style={{ fontSize: 'var(--step-label)' }}>
              viva · desfoca conteúdo que rola
            </span>
          </div>

          <GlassTokens />
        </div>
      </Section>

      <Section title="Sheet">
        <TotemButton tone="ink" data-testid="btn-open-sheet" onClick={() => setSheetOpen(true)}>Abrir sheet</TotemButton>
      </Section>

      <BottomBar>
        {/* O modo alcance saiu da barra do produto em 02-09 (ver BottomBar), mas
            o motor continua inteiro. O catálogo é o lugar certo para um
            componente que existe e ainda não está montado em nenhuma tela: aqui
            ele é exercitado, medido e testado até voltar. */}
        <div className="grid shrink-0 place-items-center px-[3cqw]">
          <ReachModeToggle />
        </div>
        <TotemButton tone="action" size="bar" className="flex-1" data-testid="btn-bar">
          <ShoppingBag strokeWidth={3} className="size-[2.4cqw]" /> Finalizar
        </TotemButton>
      </BottomBar>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Pizza de calabresa"
        footer={
          <TotemButton tone="action" size="bar" onClick={() => setSheetOpen(false)}>
            <ShoppingBag strokeWidth={3} className="size-[2.4cqw]" /> Adicionar · R$ 78,00
          </TotemButton>
        }
      >
        <p className="mb-[4cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>
          Massa fina, calabresa fatiada na hora e cebola roxa.
        </p>
        <Stepper value={qty} onChange={setQty} />
      </Sheet>
    </div>
  )
}

/**
 * Os números do vidro desta casa, por escrito.
 *
 * Existe porque "está mais leitoso do que ontem" não é um relato acionável e
 * "a cobertura subiu de 0,60 para 0,72" é. Lê do CSS e não do objeto de tema:
 * o que interessa é o que o navegador está pintando, incluindo os pisos que
 * `glassOf` levantou por conta própria — que é justamente a parte que o tema
 * do tenant não sabe.
 */
function GlassTokens() {
  const [rows, setRows] = useState<[string, string][]>([])

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const read = (name: string) => style.getPropertyValue(name).trim() || '—'
    setRows([
      ['desfoque', read('--glass-blur')],
      ['saturação', read('--glass-sat')],
      ['pane', read('--glass-pane')],
      ['viva', read('--glass-live')],
      ['véu', read('--glass-veil')],
      ['placa', read('--glass-plate')],
      ['refração', read('--glass-warp')],
    ])
  }, [])

  return (
    <dl
      data-testid="glass-tokens"
      className="glass grid grid-cols-[auto,1fr] gap-x-[3cqw] gap-y-[1cqw] rounded-totem p-[3cqw]"
      style={{ fontSize: 'var(--step-label)' }}
    >
      {rows.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="uppercase tracking-[0.2em] text-muted">{name}</dt>
          <dd className="tnum break-all text-right font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[6cqw]">
      <h2
        className="mb-[2cqw] uppercase tracking-[0.3em] text-muted"
        style={{ fontSize: 'var(--step-label)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}
