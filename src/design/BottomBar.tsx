import type { ReactNode } from 'react'
import { TalkButton } from '@/waiter/TalkButton'
import { useWaiter } from '@/waiter/useWaiter'

// ---------------------------------------------------------------------------
// The persistent bottom edge: um controle redondo a esquerda, o commit da tela
// preenchendo o resto.
//
// This exists because the reach toggle used to float over the content. On a
// panel whose middle scrolls, a floating control ALWAYS ends up on top of
// something — and a button hidden under another button is the worst kind of
// broken, because nothing about it looks wrong. Giving it a reserved slot in
// real chrome removes the whole class of collision.
//
// O SLOT DA ESQUERDA e o ponto mais perto do polegar de quem esta de pe, e
// portanto e do assistente.
//
// O MODO ALCANCE saiu da barra por ora (02-09). O motor continua inteiro em
// `useReachMode` + `ReachModeToggle` e os specs de zona de alcance continuam
// valendo — o que sumiu foi o gatilho. A razao e honesta: o bonequinho nao era
// reconhecido por ninguem, e um controle de acessibilidade que so os
// desenvolvedores entendem nao esta acessivel. Volta quando tiver uma
// affordance que se explique, provavelmente dentro de um menu de acessibilidade
// de verdade.
// ---------------------------------------------------------------------------

export function BottomBar({ children }: { children?: ReactNode }) {
  const phase = useWaiter((s) => s.phase)
  const controls = useWaiter((s) => s.controls)
  const waiterOn = phase !== 'off' && controls !== null

  return (
    <div
      data-testid="bottom-bar"
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch border-t border-white/60 bg-white/75 backdrop-blur-2xl"
      style={{ minHeight: 'var(--tap-bar)' }}
    >
      {waiterOn ? (
        <div className="grid shrink-0 place-items-center px-[3cqw]">
          <TalkButton />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 items-stretch">{children}</div>
    </div>
  )
}
