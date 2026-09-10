import { useReducedMotion } from 'motion/react'
import { Check, Circle, Plus } from 'lucide-react'
import { Chip, Sheet, Stepper, TotemButton } from '@/design'
import { brl } from '@/cart/useCart'
import { useCatalog } from '@/menu/useCatalog'
import { commitProductDraft, draftBlocking, draftModifiers, draftUnitCents, useProductDraft } from '@/menu/useProductDraft'
import type { TotemProduct } from '@/menu/types'
import { composePizza, pizzaName } from './composition'
import { PizzaStage } from './PizzaStage'
import './pizza.css'

/** A specialisation of the existing product sheet, never another menu. */
export function PizzaProductSheet({ product, onClose }: { product: TotemProduct; onClose: () => void }) {
  const draft = useProductDraft()
  const catalog = useCatalog()
  const reduced = Boolean(useReducedMotion())
  const pizza = composePizza(product, draftModifiers(product, draft.chosen))!
  pizza.mode = draft.pizzaMode
  const halfGroup = product.modifierGroups.find((group) => group.kind === 'pizza-half')
  const flavors = catalog.status === 'ready' ? catalog.catalog.products.filter((p) => p.pizza && !p.soldOut) : [product]
  const missing = draftBlocking(product, draft.chosen, draft.pizzaMode, draft.pizzaFirstChosen)
  const unit = draftUnitCents(product, draft.chosen)
  const diameter = draftModifiers(product, draft.chosen).find((m) => m.pizzaDiameterCm)?.pizzaDiameterCm
  const isSecond = draft.pizzaMode === 'half' && draft.activeHalf === 1
  const selectedFlavorId = isSecond ? pizza.second?.productId : draft.pizzaFirstChosen ? product.id : undefined
  const setMode = (mode: 'whole' | 'half') => {
    if (mode === 'whole' && halfGroup) useProductDraft.setState({ chosen: { ...draft.chosen, [halfGroup.id]: [] } })
    draft.setPizzaMode(mode)
  }

  return <Sheet open onClose={onClose} bleed ariaLabel="Monte sua pizza" data-testid="product-sheet" footer={
    <TotemButton tone="action" size="bar" data-testid="add-to-order" disabled={Boolean(missing)}
      onClick={() => { if (commitProductDraft(product)) onClose() }}>
      {missing ? `Escolha: ${missing.groupName}` : <>
        {draft.editingLineId ? <Check className="size-[2.4cqw]" /> : <Plus strokeWidth={3} className="size-[2.4cqw]" />}
        {draft.editingLineId ? 'Salvar pizza' : 'Adicionar'} · <span className="tnum" data-testid="sheet-total">{brl(unit * draft.quantity)}</span>
      </>}
    </TotemButton>
  }>
    <div data-testid="pizza-composer">
      <PizzaStage pizza={pizza} emptyFirst={!draft.pizzaFirstChosen} emptyHalf={draft.pizzaMode === 'half' && !pizza.second} activeHalf={draft.activeHalf}
        onHalfSelect={draft.setActiveHalf} reduced={reduced} diameterCm={diameter} />
      <div className="px-[6cqw] pt-[4cqw]">
        <h2 className="type-display leading-[.95] tracking-tight" style={{ fontSize: 'var(--step-title)' }}>{draft.pizzaMode === 'half' || !draft.pizzaFirstChosen ? 'Monte sua pizza' : pizzaName(pizza)}</h2>
        {draft.pizzaFirstChosen && draft.pizzaMode === 'whole' && product.description && <p className="mt-[1.5cqw] text-muted" style={{ fontSize: 'var(--step-body)' }}>{product.description}</p>}
        <div className="mt-[3cqw] grid grid-cols-2 gap-[1.5cqw]">
          <Chip selected={draft.pizzaMode === 'whole'} data-testid="pizza-mode-whole" onClick={() => setMode('whole')}>
            <span className="flex items-center gap-[1.5cqw]"><Circle className="size-[2.2cqw]" />1 sabor</span>
          </Chip>
          {halfGroup && <Chip selected={draft.pizzaMode === 'half'} data-testid="pizza-mode-half" onClick={() => setMode('half')}>
            <span className="flex items-center gap-[1.5cqw]"><span className="pizza-split-icon" aria-hidden="true" />2 sabores</span>
          </Chip>}
        </div>
        {draft.pizzaMode === 'half' && <div className="pizza-selected-flavors" role="group" aria-label="Sabores escolhidos">
          {([draft.pizzaFirstChosen ? pizza.first : undefined, pizza.second] as const).map((flavor, half) => <button key={half} type="button"
            className="pizza-selected-flavor press" aria-pressed={draft.activeHalf === half}
            aria-label={flavor ? `Editar metade ${half + 1}: ${flavor.name}` : half === 0 ? 'Escolher primeiro sabor' : 'Adicionar segundo sabor'}
            data-testid={`pizza-half-${half}`} onClick={() => draft.setActiveHalf(half as 0 | 1)}>
            {flavor ? <img src={flavor.imageUrl} alt="" /> : <span className="pizza-empty-slot" aria-hidden="true"><Plus /></span>}
            <span>{flavor ? <><small>Metade {half + 1}</small><strong>{flavor.name}</strong></> : <strong>Adicionar sabor</strong>}</span>
          </button>)}
        </div>}
        <section className="mt-[3cqw]" aria-label={isSecond ? 'Sabores da segunda metade' : 'Sabores da pizza'}>
          <h3 className="mb-[2cqw] flex items-center justify-between uppercase tracking-[.2em] text-muted" style={{ fontSize: 'var(--step-label)' }} aria-live="polite">
            {draft.pizzaMode === 'whole' ? 'Sabores' : pizza.second && draft.pizzaFirstChosen ? 'Seus sabores' : isSecond ? 'Complete com outro sabor' : 'Escolha seu sabor'}
            {draft.pizzaMode === 'half' && <span className="pizza-selection-count">{Number(draft.pizzaFirstChosen) + Number(Boolean(pizza.second))} de 2</span>}
          </h3>
          <div className="pizza-choices">
            {flavors.map((flavor) => {
              const option = halfGroup?.modifiers.find((m) => m.pizzaFlavor?.productId === flavor.id)
              if (isSecond && !option) return null
              return <button type="button" key={flavor.id} className="pizza-choice press"
                data-testid={isSecond ? `mod-${option!.id}` : `pizza-flavor-${flavor.id}`}
                aria-pressed={selectedFlavorId === flavor.id}
                onClick={() => draft.choosePizza(flavor, isSecond ? 1 : 0)}>
                <img src={flavor.pizza!.imageUrl} alt="" draggable={false} />
                <span><strong>{flavor.name}</strong><small className="tnum">{isSecond ? option!.surchargeCents ? `+ ${brl(option!.surchargeCents)}` : 'Sem acréscimo' : brl(flavor.priceCents)}</small></span>
              </button>
            })}
          </div>
          {draft.pizzaMode === 'half' && <p className="mt-[1.5cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>
            Valor base + acréscimo do segundo sabor.
          </p>}
        </section>
      </div>
      {product.modifierGroups.filter((group) => group.kind !== 'pizza-half').map((group) => <section key={group.id} className="mt-[4cqw] px-[6cqw]">
        <h3 className="mb-[2cqw] uppercase tracking-[.25em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
          {group.name}{group.required && <span className="text-action-ink"> · obrigatório</span>}
        </h3>
        <div className="grid grid-cols-3 gap-[1.5cqw]">
          {group.modifiers.map((modifier) => <Chip key={modifier.id} compact data-testid={`mod-${modifier.id}`}
            selected={(draft.chosen[group.id] ?? []).includes(modifier.id)} surchargeCents={modifier.surchargeCents || undefined}
            onClick={() => draft.toggle(group.id, modifier.id, group.maxSelections)}>{modifier.name}</Chip>)}
        </div>
      </section>)}
      <div className="mt-[4cqw] flex items-center justify-between px-[6cqw]">
        {draft.pizzaFirstChosen ? <span className="tnum font-bold text-action-ink" style={{ fontSize: 'var(--step-title)' }}>{brl(unit)}</span>
          : <span className="text-muted" style={{ fontSize: 'var(--step-body)' }}>Quantidade</span>}
        <Stepper value={draft.quantity} onChange={draft.setQuantity} data-testid="product-stepper" />
      </div>
    </div>
  </Sheet>
}
