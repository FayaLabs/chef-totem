import { useEffect, useRef, useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import { Chip, Sheet, Stepper, TotemButton } from '@/design'
import { brl, useCart } from '@/cart/useCart'
import { useCatalog } from '@/menu/useCatalog'
import { commitProductDraft, draftBlocking, draftModifiers, draftUnitCents, useProductDraft } from '@/menu/useProductDraft'
import type { TotemModifierGroup, TotemProduct } from '@/menu/types'
import { BurgerInteractiveStage } from './BurgerInteractiveStage'
import { BurgerStill, burgerDimensions } from './BurgerStill'
import { burgerLayers, ingredientLayer } from './composition'
import { BURGER_ASSETS, type BurgerLayer } from './pilot'
import { useBurgerReveal } from './useBurgerReveal'
import { showBurgerArrival } from './BurgerCartArrival'
import './burger.css'

const NONE = new Set<string>()
const GROUP_TITLES: Partial<Record<NonNullable<TotemModifierGroup['kind']>, string>> = {
  'burger-bread': 'O pão', 'burger-point': 'Ponto da carne', 'burger-extras': 'Um toque a mais',
  'burger-removals': 'Prefere sem algum ingrediente?', 'burger-combo': 'Complete com um combo',
}

/** Same product draft and pricing contract as the rest of the kiosk. The view
 * toggle never owns ingredients, and animation never commits an order. */
export function BurgerProductSheet({ product, onClose }: { product: TotemProduct; onClose: () => void }) {
  const draft = useProductDraft()
  const catalog = useCatalog()
  const recipes = catalog.status === 'ready' ? catalog.catalog.products.filter((p) => p.burger) : [product]
  const [failed, setFailed] = useState(false)
  const [removedExtras, setRemovedExtras] = useState<BurgerLayer[]>([])
  const body = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const modifiers = draftModifiers(product, draft.chosen)
  const layers = burgerLayers(product, modifiers)
  const revealSignature = JSON.stringify([product.id, draft.burgerRecipeChosen,
    ...modifiers.filter((m) => m.burgerEffect).map((m) => m.id).sort()])
  const { view, open, reveal, close, pause, resume } = useBurgerReveal(revealSignature, failed)
  const allLayers = burgerLayers(product, modifiers, true)
  const removalGroups = product.modifierGroups.filter((g) => g.kind === 'burger-removals')
  const removal = removalGroups.flatMap((group) => group.modifiers.map((modifier) => ({ group, modifier })))
  const extras = product.modifierGroups.filter((g) => g.kind === 'burger-extras')
    .flatMap((group) => group.modifiers.map((modifier) => ({ group, modifier })))
  const removedIds = new Set(modifiers.flatMap((m) => m.burgerEffect?.kind === 'remove' ? [m.burgerEffect.layerId] : []))
  const missing = draftBlocking(product, draft.chosen, draft.pizzaMode, draft.pizzaFirstChosen, draft.burgerRecipeChosen)
  const total = draftUnitCents(product, draft.chosen) * draft.quantity
  const restorable = [...allLayers.filter((l) => removedIds.has(l.id)), ...removedExtras.filter((l) => !layers.some((included) => included.id === l.id))]
  const findRemoval = (id: string) => removal.find(({ modifier }) => modifier.burgerEffect?.kind === 'remove' && modifier.burgerEffect.layerId === id)
  const findExtra = (id: string) => extras.find(({ modifier }) => `extra-${modifier.id}` === id)
  const focusSection = (id: string) => {
    const section = body.current?.querySelector<HTMLElement>(`[data-section="${id}"]`)
    section?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    section?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  useEffect(() => { setRemovedExtras([]) }, [product.id])

  function remove(id: string) {
    const option = findRemoval(id) ?? findExtra(id)
    if (!option) return
    const { group, modifier } = option
    const selected = (draft.chosen[group.id] ?? []).includes(modifier.id)
    if (modifier.burgerEffect?.kind === 'remove' && !selected) draft.toggle(group.id, modifier.id, group.maxSelections)
    if (modifier.burgerEffect?.kind === 'extra' && selected) {
      const layer = ingredientLayer(id, modifier.burgerEffect.asset)
      setRemovedExtras((previous) => [...previous.filter((l) => l.id !== id), layer])
      draft.toggle(group.id, modifier.id, group.maxSelections)
    }
  }
  function restore(id: string) {
    const option = findRemoval(id) ?? findExtra(id)
    if (!option) return
    const { group, modifier } = option
    const selected = (draft.chosen[group.id] ?? []).includes(modifier.id)
    if ((modifier.burgerEffect?.kind === 'remove' && selected) || (modifier.burgerEffect?.kind === 'extra' && !selected)) {
      draft.toggle(group.id, modifier.id, group.maxSelections)
    }
  }

  function add() {
    const source = preview.current?.querySelector('.burger-live-stage .burger-scene')?.getBoundingClientRect()
    const target = document.querySelector('[data-testid="open-cart"], [data-testid="cart-flash"]')?.getBoundingClientRect()
    if (!commitProductDraft(product)) return
    if (source && target && !failed) showBurgerArrival({ layers, source, target, open, seq: useCart.getState().lastAdded!.seq })
    onClose()
  }

  return <Sheet open bleed onClose={onClose} ariaLabel="Monte seu burger" data-testid="product-sheet"
    header={<div className="burger-preview" data-testid="burger-preview" ref={preview}
      onPointerDownCapture={pause} onPointerUpCapture={resume} onPointerCancelCapture={resume}>
      <div className="burger-preview-content">
        <div className="burger-live-stage" data-hidden={view === 'photo' || failed} aria-hidden={view === 'photo' || failed}>
          <BurgerInteractiveStage layers={layers} dimensions={burgerDimensions} open={open} removed={NONE}
            restorableLayers={restorable} onRemove={remove} onRestore={restore}
            canRemove={(id) => Boolean(findRemoval(id) || findExtra(id))}
            onChangeLayer={(id) => focusSection(id === 'top' || id === 'bottom' ? 'burger-bread' : 'burger-recipe')}
            onImageError={() => setFailed(true)} />
        </div>
        {view === 'photo' && <div className="burger-photo-stage">
              <div className="burger-scene"><BurgerStill layers={layers} alt={`${product.name}, sua montagem`} fallback={product.imageUrl} /></div>
            </div>}
      </div>
      <div className="burger-preview-controls" data-testid="burger-preview-controls" role="group" aria-label="Visualização do burger">
        <button type="button" aria-pressed={!open} aria-label="Ver burger montado" title="Ver burger montado" onClick={close} data-testid="burger-photo-toggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10a9 7 0 0 1 18 0H3ZM3 18h18l-1.3 3H4.3L3 18ZM3 13l3 1.5L9 13l3 1.5 3-1.5 3 1.5 3-1.5M3 16h18M9 6h.01M15 6h.01" />
          </svg>
        </button>
        <button type="button" aria-pressed={open} aria-label="Abrir camadas" title="Abrir camadas" onClick={reveal} disabled={failed} data-testid="burger-layers-toggle">
          <Layers aria-hidden="true" strokeWidth={1.7} />
        </button>
      </div>
      {failed && <p className="px-[6cqw] py-[2cqw] text-white/70" style={{ fontSize: 'var(--step-label)' }} role="status">A prévia de camadas não carregou. Você pode continuar pelas opções abaixo.</p>}
    </div>}
    footer={<TotemButton tone="action" size="bar" data-testid="add-to-order" disabled={Boolean(missing) || product.soldOut}
      onClick={add}>
      {missing ? `Escolha: ${missing.groupName}` : <><Plus strokeWidth={3} className="size-[2.4cqw]" />
        {draft.editingLineId ? 'Salvar burger' : 'Adicionar'} · <span className="tnum" data-testid="sheet-total">{brl(total)}</span></>}
    </TotemButton>}>
    <div className="burger-builder" data-testid="burger-builder" data-view={view} data-product={product.id}>
      <div className="px-[6cqw] pt-[3cqw]" ref={body}>
        <div className="flex items-center justify-between gap-[2cqw]">
          <div><p className="text-muted uppercase tracking-[.14em]" style={{ fontSize: 'var(--step-label)' }}>Feito do seu jeito</p>
            <h2 className="type-display mt-[1cqw]" style={{ fontSize: 'var(--step-title)' }}>{draft.burgerRecipeChosen ? product.name : 'Monte seu burger'}</h2></div>
          <Stepper value={draft.quantity} onChange={draft.setQuantity} data-testid="product-stepper" />
        </div>
        <section className="mt-[3cqw]" data-section="burger-recipe">
          <h3 className="burger-group-title">Seu burger</h3>
          <div className="burger-recipe-list">
            {recipes.map((recipe) => <Chip key={recipe.id} compact selected={draft.burgerRecipeChosen && recipe.id === product.id}
              disabled={recipe.soldOut} data-testid={`burger-recipe-${recipe.id}`} onClick={() => draft.chooseBurger(recipe)}>
              <BurgerStill layers={burgerLayers(recipe, [])} fallback={recipe.imageUrl} className="burger-recipe-thumb" />
              <span>{recipe.name}</span><span className="mt-[.5cqw] block font-normal">{recipe.soldOut ? 'Esgotado' : brl(recipe.priceCents)}</span>
            </Chip>)}
          </div>
        </section>
        <p className="mt-[2cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>{product.description}</p>
        {product.modifierGroups.map((group) => <section key={group.id} className="mt-[3cqw]" data-section={group.kind}>
          <h3 className="burger-group-title">{GROUP_TITLES[group.kind!] ?? group.name}
            {group.required && <span className="burger-required">{(draft.chosen[group.id] ?? []).length ? '✓' : 'Escolha 1'}</span>}</h3>
          <div className="grid grid-cols-3 gap-[1.5cqw]">
            {group.modifiers.map((modifier) => <Chip key={modifier.id} compact data-testid={`mod-${modifier.id}`}
              selected={(draft.chosen[group.id] ?? []).includes(modifier.id)} surchargeCents={modifier.surchargeCents || undefined}
              onClick={() => draft.toggle(group.id, modifier.id, group.maxSelections)}>
              {modifier.burgerEffect?.kind === 'bread' && <img src={`${BURGER_ASSETS}/${modifier.burgerEffect.bread}-top.webp`} alt="" className="burger-bread-thumb" />}
              {modifier.burgerEffect?.kind === 'extra' && <img src={`${BURGER_ASSETS}/${modifier.burgerEffect.asset}.webp`} alt="" className="burger-bread-thumb" />}
              {modifier.name}
            </Chip>)}
          </div>
        </section>)}
      </div>
    </div>
  </Sheet>
}
