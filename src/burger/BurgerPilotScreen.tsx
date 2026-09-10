import { useEffect, useState } from 'react'
import { Chip, Sheet, TotemButton } from '@/design'
import { BurgerInteractiveStage } from './BurgerInteractiveStage'
import { BURGER_ASSETS, pilotBurger } from './pilot'
import { BURGER_BREADS, BURGER_RECIPES, ingredientLayer, recipeLayers } from './composition'
import type { BurgerBread, BurgerRecipeId } from './types'

/** Development-only visual gate. Does not select, price, or order a catalog product. */
export function BurgerPilotScreen() {
  const [visible, setVisible] = useState(true)
  const [open, setOpen] = useState(true)
  const [bacon, setBacon] = useState(true)
  const [onion, setOnion] = useState(true)
  const [cheese, setCheese] = useState(true)
  const [double, setDouble] = useState(false)
  const [bread, setBread] = useState<BurgerBread>('brioche')
  const [recipe, setRecipe] = useState<BurgerRecipeId>('cheddar-bacon')
  const [egg, setEgg] = useState(false)
  const [rawOnion, setRawOnion] = useState(false)
  const [removed, setRemoved] = useState<Set<string>>(() => new Set())
  const restore = (id: string) => setRemoved((previous) => { const next = new Set(previous); next.delete(id); return next })
  const [dimensions, setDimensions] = useState<Record<string, { width: number; height: number }> | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${BURGER_ASSETS}/assets.json`, { signal: controller.signal }).then((r) => {
      if (!r.ok) throw new Error('Asset manifest unavailable')
      return r.json()
    }).then(setDimensions).catch((e) => { if (e.name !== 'AbortError') setFailed(true) })
    return () => controller.abort()
  }, [])
  const layers = recipe === 'cheddar-bacon' ? pilotBurger({ bacon, onion, cheese, double }).map((layer) =>
    layer.id === 'top' || layer.id === 'bottom' ? { ...layer, asset: `${bread}-${layer.id}` as const, label: BURGER_BREADS[bread] } : layer)
    : recipeLayers(recipe, bread)
  if (egg) layers.splice(layers.length - 1, 0, ingredientLayer('pilot-egg', 'egg'))
  if (rawOnion) layers.splice(layers.length - 1, 0, ingredientLayer('pilot-onion', 'onion'))
  return <div className="absolute inset-0 surface-page flex flex-col justify-center p-[6cqw]" data-testid="burger-pilot">
    <p className="text-muted mb-[2cqw]" style={{ fontSize: 'var(--step-body)' }}>MaxBurger · piloto visual</p>
    <h1 className="type-display mb-[4cqw]" style={{ fontSize: 'var(--step-display)' }}>Camadas que dão fome</h1>
    <TotemButton onClick={() => setVisible(true)}>Ver montagem</TotemButton>
    <Sheet open={visible} onClose={() => setVisible(false)} bleed ariaLabel="Piloto do burger" data-testid="burger-pilot-sheet"
      footer={<TotemButton tone="action" size="bar" onClick={() => setOpen(!open)} data-testid="burger-pilot-toggle">
        {open ? 'Ver montado' : 'Abrir camadas'}
      </TotemButton>}>
      {dimensions ? <BurgerInteractiveStage layers={layers} dimensions={dimensions} open={open} removed={removed}
        onRemove={(id) => setRemoved((previous) => new Set(previous).add(id))} onRestore={restore} />
        : <div className="burger-stage"><p className="text-white text-center">{failed ? 'Não foi possível carregar o piloto.' : 'Preparando as camadas…'}</p></div>}
      <div className="px-[6cqw] pt-[4cqw]">
        <h2 className="type-display" style={{ fontSize: 'var(--step-title)' }}>Seu burger, camada por camada</h2>
        <p className="text-muted mt-[1.5cqw]" style={{ fontSize: 'var(--step-body)' }}>{BURGER_RECIPES[recipe].name} · {BURGER_BREADS[bread]}</p>
        <div className="grid grid-cols-2 gap-[1.5cqw] mt-[3cqw]">
          <Chip selected={open} onClick={() => setOpen(true)} data-testid="burger-view-open">Camadas</Chip>
          <Chip selected={!open} onClick={() => setOpen(false)} data-testid="burger-view-closed">Montado</Chip>
        </div>
        <h3 className="text-muted uppercase mt-[4cqw] mb-[2cqw]" style={{ fontSize: 'var(--step-label)' }}>Experimente a composição</h3>
        <div className="grid grid-cols-3 gap-[1.5cqw] mb-[2cqw]">
          {(Object.keys(BURGER_BREADS) as BurgerBread[]).map((id) => <Chip key={id} compact selected={bread === id}
            onClick={() => setBread(id)} data-testid={`burger-pilot-bread-${id}`}>{BURGER_BREADS[id]}</Chip>)}
        </div>
        <div className="grid grid-cols-3 gap-[1.5cqw] mb-[2cqw]">
          {(Object.keys(BURGER_RECIPES) as BurgerRecipeId[]).map((id) => <Chip key={id} compact selected={recipe === id}
            onClick={() => { setRecipe(id); setRemoved(new Set()) }} data-testid={`burger-pilot-recipe-${id}`}>{BURGER_RECIPES[id].name}</Chip>)}
        </div>
        {recipe === 'cheddar-bacon' && <div className="grid grid-cols-2 gap-[1.5cqw]">
          <Chip selected={cheese && !removed.has('cheese-0')} onClick={() => {
            if (!cheese || removed.has('cheese-0')) { setCheese(true); restore('cheese-0'); restore('cheese-1') }
            else setCheese(false)
          }} data-testid="burger-pilot-cheese">Cheddar derretido</Chip>
          <Chip selected={bacon && !removed.has('bacon')} onClick={() => {
            if (!bacon || removed.has('bacon')) { setBacon(true); restore('bacon') }
            else setBacon(false)
          }} data-testid="burger-pilot-bacon">Bacon</Chip>
          <Chip selected={onion && !removed.has('onion')} onClick={() => {
            if (!onion || removed.has('onion')) { setOnion(true); restore('onion') }
            else setOnion(false)
          }} data-testid="burger-pilot-onion">Cebola crispy</Chip>
          <Chip selected={double && !removed.has('meat-1')} onClick={() => {
            if (!double || removed.has('meat-1')) { setDouble(true); restore('meat-0'); restore('meat-1') }
            else setDouble(false)
          }} data-testid="burger-pilot-double">Duas carnes</Chip>
        </div>}
        <div className="grid grid-cols-2 gap-[1.5cqw] mt-[1.5cqw]">
          <Chip selected={egg && !removed.has('pilot-egg')} onClick={() => { setEgg(!egg || removed.has('pilot-egg')); restore('pilot-egg') }}>Ovo</Chip>
          <Chip selected={rawOnion && !removed.has('pilot-onion')} onClick={() => { setRawOnion(!rawOnion || removed.has('pilot-onion')); restore('pilot-onion') }}>Cebola roxa</Chip>
        </div>
        <p className="text-muted mt-[4cqw]" style={{ fontSize: 'var(--step-label)' }}>Piloto de imagem e movimento. Não altera o cardápio nem adiciona ao pedido.</p>
      </div>
    </Sheet>
  </div>
}
