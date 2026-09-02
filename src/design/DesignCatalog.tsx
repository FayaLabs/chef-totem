import { useState } from 'react'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import {
  BottomBar,
  ReachModeToggle,
  Chip,
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
      className="size-full overflow-y-auto bg-page px-[5cqw] pt-[5cqw] pb-[calc(var(--tap-bar)+5cqw)]"
    >
      <header className="mb-[5cqw]">
        <h1 className="font-display uppercase leading-[0.9]" style={{ fontSize: 'var(--step-display)' }}>
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
