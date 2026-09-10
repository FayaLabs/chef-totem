import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Sheet, TotemButton } from '@/design'
import { totemConfig, TOTEM_RELEASE } from '@/config/totem.config'
import {
  activeDemoTenant,
  activeSelection,
  isDemoCatalog,
  selectDemo,
  selectionSource,
  type DemoSelection,
} from '@/demo/mode'
import { DEMO_TENANTS, DEMO_TENANT_IDS } from '@/demo/tenants'
import { defaultTheme } from '@/design/theme'

// ---------------------------------------------------------------------------
// O painel de serviço: em que casa o totem está, e o que ele é por dentro.
//
// O problema é real e é de feira: o painel fica ligado o dia inteiro em tela
// cheia, e a pergunta "dá pra ver como fica numa hamburgueria?" chega no meio
// de uma conversa com um cliente. Trocar de casa não pode custar um laptop, um
// teclado ou um reinício de servidor — e num quiosque em tela cheia não existe
// barra de endereço para digitar `?tenant=`.
//
// O GATILHO É A ETIQUETA DA BUILD, e chegar aqui levou quatro tentativas.
//
//   1. Um retângulo transparente no canto. Invisível de verdade: quem precisava
//      dele não o achou.
//   2. Um ponto colorido de 19px. Sumiu igual — sobre um pôster escuro de forno
//      a lenha, um ponto discreto é um ponto invisível.
//   3. Uma etiqueta própria, LOGO ABAIXO da etiqueta da build. Pior de todas,
//      porque parecia resolvido e não estava: quem operava o painel via a
//      etiqueta da build (que já existia, no mesmo canto, no mesmo material),
//      tocava NELA, e nada acontecia. Dois chips quase idênticos a três
//      centímetros um do outro, e só um deles respondendo, é uma armadilha —
//      não um controle.
//   4. A própria etiqueta da build É o botão. Ela já está no canto superior
//      direito de TODA tela, já é onde a mão de quem opera o totem vai quando
//      alguém pergunta "qual versão é essa?", e agora responde ao toque.
//
// A discrição vem de PARECER INFORMAÇÃO, não de estar escondida. Ninguém toca
// numa etiqueta de versão; quem precisa dela toca primeiro.
//
// O GATILHO mora em `kiosk/TotemViewport.tsx`, junto da etiqueta. Este arquivo
// é só o conteúdo do painel.
// ---------------------------------------------------------------------------

/**
 * O nome da casa no ar, para a etiqueta que abre este painel.
 *
 * Vive aqui e não no `TotemViewport` porque quem sabe o que "a casa no ar"
 * significa — URL, armazenamento, `.env`, e o caso de estar ao vivo — é este
 * módulo. O palco só desenha.
 */
export function activeHouseLabel(): { name: string; colour: string } {
  if (!isDemoCatalog()) return { name: 'Ao vivo', colour: '#FFFFFF' }
  const tenant = activeDemoTenant()
  return { name: tenant.brand.name, colour: tenant.theme.action ?? defaultTheme.action }
}

export function ServicePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // A escolha EFETIVA, não a explícita: sem ninguém ter escolhido nada o painel
  // já está numa casa (a do `.env`), e uma lista sem marca nenhuma assinalada
  // faria o operador achar que o seletor não sabe onde está.
  const current: DemoSelection = isDemoCatalog() ? activeDemoTenant().id : 'live'

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Painel de serviço"
        data-testid="tenant-switcher"
        footer={
          <TotemButton
            tone="bar-quiet"
            size="bar"
            data-testid="tenant-switcher-close"
            onClick={onClose}
          >
            Fechar
          </TotemButton>
        }
      >
        <p className="pb-[3cqw] text-muted" style={{ fontSize: 'var(--step-label)' }}>
          Trocar de casa recarrega o painel e leva junto a marca, o cardápio e a voz do assistente.
        </p>

        <ul className="flex flex-col gap-[2cqw]">
          {DEMO_TENANT_IDS.map((id) => {
            const tenant = DEMO_TENANTS[id]
            const theme = { ...defaultTheme, ...tenant.theme }
            return (
              <li key={id}>
                <Option
                  testId={`tenant-option-${id}`}
                  name={tenant.brand.name}
                  detail={tenant.brand.tagline}
                  swatches={[theme.action, theme.page, theme.accent]}
                  current={current === id}
                  onSelect={() => selectDemo(id)}
                />
              </li>
            )
          })}

          <li>
            {/* O caminho de volta. Sem ele, um painel que alguém trocou numa
                feira volta para o cliente real com a marca errada e o pedido
                indo para lugar nenhum — e o conserto seria editar a URL, que é
                exatamente o que este seletor existe para evitar. */}
            <Option
              testId="tenant-option-live"
              name="Ao vivo"
              detail="Cardápio e pedidos do tenant real deste aparelho"
              swatches={[defaultTheme.action, defaultTheme.page, defaultTheme.accent]}
              current={current === 'live'}
              onSelect={() => selectDemo('live')}
            />
          </li>
        </ul>

        <Debug />
      </Sheet>
    </>
  )
}

/**
 * O que este aparelho é, por escrito.
 *
 * Quem consegue consertar um totem está de pé na frente dele, sem console e sem
 * teclado. "Não está pegando o cardápio" tem quatro causas possíveis — modo
 * errado, tenant errado, projeto errado, sessão de aparelho sem senha — e as
 * quatro se distinguem em uma tela de texto. Sem ela, a resposta é ligar para
 * alguém que abra um terminal.
 *
 * O que NÃO entra aqui: a senha do aparelho e a chave do Supabase. O painel
 * fica virado para um salão, e um segredo na tela é um segredo publicado.
 */
function Debug() {
  const [stage, setStage] = useState('—')

  useEffect(() => {
    const box = document.querySelector('[data-totem-stage]')?.getBoundingClientRect()
    if (box) setStage(`${Math.round(box.width)}×${Math.round(box.height)}`)
  }, [])

  const env = import.meta.env
  const host = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host.split('.')[0] : '—'
  const selection = activeSelection()

  const rows: [string, string][] = [
    ['Build', TOTEM_RELEASE],
    ['Cardápio', isDemoCatalog() ? 'demonstração' : 'ao vivo (Supabase)'],
    ['Casa', isDemoCatalog() ? `${activeDemoTenant().brand.name} (${activeDemoTenant().id})` : '—'],
    ['Escolha veio de', selection ? `${selectionSource()} → ${selection}` : '.env (nada escolhido)'],
    ['Totem', totemConfig.totemId],
    ['Tenant', totemConfig.tenantId || '—'],
    ['Unidade', totemConfig.unitId || '—'],
    ['Projeto', host],
    ['Assistente', totemConfig.flags.assistant ? (env.VITE_TOTEM_WAITER ?? 'scripted') : 'desligado'],
    ['Palco', stage],
  ]

  return (
    <div className="mt-[4cqw] border-t-2 border-hairline pt-[3cqw]" data-testid="tenant-debug">
      <h3 className="uppercase tracking-[0.25em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
        Este aparelho
      </h3>
      <dl className="mt-[2cqw] grid grid-cols-[auto,1fr] gap-x-[3cqw] gap-y-[1.2cqw]">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="uppercase tracking-[0.15em] text-muted" style={{ fontSize: 'var(--step-label)' }}>
              {key}
            </dt>
            <dd
              className="tnum break-all text-right font-semibold"
              style={{ fontSize: 'var(--step-label)' }}
              data-testid={`debug-${key.toLowerCase().replace(/[^a-z]+/g, '-')}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Option({
  testId,
  name,
  detail,
  swatches,
  current,
  onSelect,
}: {
  testId: string
  name: string
  detail: string
  swatches: (string | undefined)[]
  current: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={current}
      onClick={onSelect}
      className={[
        'press flex w-full min-h-[var(--tap)] items-center gap-[3cqw] rounded-totem px-[3cqw] py-[2cqw] text-left',
        current ? 'sheen bg-ink text-white' : 'glass text-ink',
      ].join(' ')}
    >
      {/* A paleta da casa, não um ícone. Numa feira o operador não lê "Café
          Sabor" na lista: ele reconhece o verde. */}
      <span aria-hidden className="flex shrink-0 overflow-hidden rounded-full border-2 border-white/40">
        {swatches.map((colour) => (
          <span key={colour} className="block size-[3.4cqw]" style={{ backgroundColor: colour }} />
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-bold uppercase tracking-[0.1em]" style={{ fontSize: 'var(--step-body)' }}>
          {name}
        </span>
        <span
          className={['block truncate', current ? 'text-white/70' : 'text-muted'].join(' ')}
          style={{ fontSize: 'var(--step-label)' }}
        >
          {detail}
        </span>
      </span>

      {current ? <Check strokeWidth={3} className="size-[3cqw] shrink-0" /> : null}
    </button>
  )
}
