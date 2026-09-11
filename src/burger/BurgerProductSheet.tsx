import { useEffect, useRef, useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import { Chip, Sheet, Stepper, TotemButton } from '@/design'
import { brl, useCart } from '@/cart/useCart'
import { playItemSound } from '@/feedback/itemSound'
import { useCatalog } from '@/menu/useCatalog'
import { commitProductDraft, draftBlocking, draftModifiers, draftUnitCents, useProductDraft } from '@/menu/useProductDraft'
import { StepHeading, stepHint } from '@/menu/StepHeading'
import { scrollToStepSoon, stepDone, stepFilled, stepFull, useStepFlow } from '@/menu/useStepFlow'
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
  // A receita é a etapa 1; os grupos vêm depois, na ordem em que aparecem.
  const advance = useStepFlow([
    { id: 'burger-recipe', done: draft.burgerRecipeChosen },
    ...product.modifierGroups.map((group) => ({ id: group.id, done: stepDone(group, draft.chosen) })),
  ])
  const focusSection = (id: string) => {
    const section = body.current?.querySelector<HTMLElement>(`[data-section="${id}"]`)
    section?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    section?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  useEffect(() => { setRemovedExtras([]) }, [product.id])
  // ABRE NA ETAPA DO PÃO quando o lanche já veio escolhido da grade. Quem
  // tocou no cartão do Cheddar Bacon já respondeu "qual lanche"; abrir o sheet
  // na lista de lanches é pedir a mesma resposta de novo, e a segunda pergunta
  // igual é onde o cliente conclui que o totem não entendeu a primeira.
  const openedChosen = useRef(draft.burgerRecipeChosen)
  useEffect(() => {
    if (!openedChosen.current) return
    const bread = product.modifierGroups.find((g) => g.kind === 'burger-bread')
    if (bread) scrollToStepSoon(bread.id)
  }, [product.modifierGroups])

  function remove(id: string) {
    const option = findRemoval(id) ?? findExtra(id)
    if (!option) return
    const { group, modifier } = option
    const selected = (draft.chosen[group.id] ?? []).includes(modifier.id)
    if (modifier.burgerEffect?.kind === 'remove' && !selected) {
      draft.toggle(group.id, modifier.id, group.maxSelections); playItemSound('remove')
    }
    if (modifier.burgerEffect?.kind === 'extra' && selected) {
      const layer = ingredientLayer(id, modifier.burgerEffect.asset)
      setRemovedExtras((previous) => [...previous.filter((l) => l.id !== id), layer])
      draft.toggle(group.id, modifier.id, group.maxSelections, group.required)
      playItemSound('remove')
    }
  }
  function restore(id: string) {
    const option = findRemoval(id) ?? findExtra(id)
    if (!option) return
    const { group, modifier } = option
    const selected = (draft.chosen[group.id] ?? []).includes(modifier.id)
    if ((modifier.burgerEffect?.kind === 'remove' && selected) || (modifier.burgerEffect?.kind === 'extra' && !selected)) {
      draft.toggle(group.id, modifier.id, group.maxSelections, group.required)
      playItemSound('add')
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
        <div className="burger-live-stage" data-hidden={view === 'photo' || failed}>
          <BurgerInteractiveStage layers={layers} dimensions={burgerDimensions} open={open} removed={NONE}
            restorableLayers={restorable} onRemove={remove} onRestore={restore}
            canRemove={(id) => Boolean(findRemoval(id) || findExtra(id))}
            onChangeLayer={(id) => focusSection(id === 'top' || id === 'bottom' ? 'burger-bread' : 'burger-recipe')}
            onImageError={() => setFailed(true)} />
        </div>
        {/* A FOTO É O BOTÃO. Ela ocupava metade da prévia com `pointer-events:
            none`: o cliente tocava no burger, nada acontecia, e o caminho para
            ver as camadas era um ícone de 6cqw no canto. Num totem, o dedo vai
            na comida — é o único alvo que a pessoa tem certeza de ter visto. */}
        {view === 'photo' && <button type="button" className="burger-photo-stage" data-testid="burger-photo-expand"
          aria-label="Ver as camadas do burger" title="Ver as camadas do burger" disabled={failed}
          onClick={() => { reveal(); pause() }}>
              <div className="burger-scene"><BurgerStill layers={layers} alt={`${product.name}, sua montagem`} fallback={product.imageUrl} /></div>
            </button>}
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
        <section className="mt-[3cqw]" data-section="burger-recipe" data-step="burger-recipe">
          <StepHeading index={1} title="Seu burger" required done={draft.burgerRecipeChosen}
            hint={draft.burgerRecipeChosen ? 'Pronto' : 'Escolha 1'} />
          <div className="burger-recipe-list">
            {recipes.map((recipe) => <Chip key={recipe.id} compact selected={draft.burgerRecipeChosen && recipe.id === product.id}
              disabled={recipe.soldOut} data-testid={`burger-recipe-${recipe.id}`}
              onClick={() => {
                if (!draft.burgerRecipeChosen || recipe.id !== product.id) playItemSound('add')
                draft.chooseBurger(recipe)
                // Desce até O PÃO, e não até a próxima etapa em aberto: o pão
                // da receita já vem marcado, então "em aberto" pularia justo a
                // escolha que o cliente pode querer trocar — e ele nunca veria
                // que ela foi feita por ele.
                const bread = recipe.modifierGroups.find((g) => g.kind === 'burger-bread')
                if (bread) scrollToStepSoon(bread.id)
                else advance('burger-recipe')
              }}>
              {/* ESGOTADO AQUI É O MESMO ESGOTADO DA GRADE: foto apagada e em
                  cinza, tarja opaca por cima. Eram dois desenhos para o mesmo
                  fato — lá fora um carimbo, aqui uma palavra no lugar do preço
                  — e o cliente que acabou de ver o cartão apagado na grade não
                  reconhece o mesmo lanche indisponível dentro do sheet. */}
              <span className="burger-recipe-media" data-sold-out={recipe.soldOut || undefined}>
                <BurgerStill layers={burgerLayers(recipe, [])} fallback={recipe.imageUrl} className="burger-recipe-thumb" />
                {recipe.soldOut ? <span className="burger-recipe-soldout">Esgotado</span> : null}
              </span>
              {/* O PREÇO FICA, mesmo esgotado — a tarja já diz que hoje não
                  tem, e trocar o preço pela mesma palavra é dizer duas vezes a
                  mesma coisa e esconder a única informação que ainda serve:
                  quanto custa quando voltar. É o que o cartão da grade faz. */}
              <span>{recipe.name}</span><span className="mt-[.5cqw] block font-normal">{brl(recipe.priceCents)}</span>
            </Chip>)}
          </div>
        </section>
        {/* AS PERSONALIZAÇÕES SÓ EXISTEM DEPOIS DO LANCHE. Pão, ponto e
            adicionais de um burger que ainda não foi escolhido são sete grupos
            perguntando sobre nada — e, pior, perguntando ANTES da única
            pergunta que importa. Na montagem em branco a tela mostra só os
            lanches; escolhido um, o resto aparece. */}
        {draft.burgerRecipeChosen && <p className="mt-[2cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>{product.description}</p>}
        {draft.burgerRecipeChosen && product.modifierGroups.map((group, index) => <section key={group.id} className="mt-[3cqw]" data-section={group.kind} data-step={group.id}>
          <StepHeading index={index + 2} title={GROUP_TITLES[group.kind!] ?? group.name} required={group.required}
            done={stepFilled(group, draft.chosen)}
            hint={stepHint(group.required, group.minSelections, group.maxSelections, (draft.chosen[group.id] ?? []).length)} />
          <div className="grid grid-cols-3 gap-[1.5cqw]">
            {group.modifiers.map((modifier) => <Chip key={modifier.id} compact data-testid={`mod-${modifier.id}`}
              selected={(draft.chosen[group.id] ?? []).includes(modifier.id)} surchargeCents={modifier.surchargeCents || undefined}
              onClick={() => {
                const adding = !(draft.chosen[group.id] ?? []).includes(modifier.id)
                draft.toggle(group.id, modifier.id, group.maxSelections, group.required)
                if (modifier.burgerEffect) playItemSound(modifier.burgerEffect.kind === 'remove' ? (adding ? 'remove' : 'add') : (adding ? 'add' : 'remove'))
                if (adding && stepFull(group, useProductDraft.getState().chosen)) advance(group.id)
              }}>
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
