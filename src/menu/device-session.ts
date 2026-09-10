import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { totemConfig } from '@/config/totem.config'

// ---------------------------------------------------------------------------
// The totem's own login.
//
// There is no `anon` policy anywhere on products, categories or orders in the
// restaurant pool: every policy is `authenticated` AND a tenant membership AND
// a permission. A customer at a kiosk has no account, so SOMETHING has to be
// authenticated — and the two other ways of getting there are both worse:
//
//   - a SECURITY DEFINER RPC open to anon is exactly the hole the ecommerce
//     pool audit found on 2026-08-31 (a whole pool's stock and exports
//     reachable without a session);
//   - a service-role key in the bundle is that hole with the door removed.
//
// So the panel signs in as ITSELF: a service user that is a member of the
// tenant, holding only `catalog.read` and `orders.create`. RLS keeps working
// unchanged, the order has a real author, and revoking one totem is disabling
// one user.
//
// The credentials are in the panel's .env, which never leaves the machine. That
// is the same trust level as the till: whoever can read the totem's disk can
// already take its money.
// ---------------------------------------------------------------------------

let client: SupabaseClient | null = null
let signedIn: Promise<void> | null = null

export class DeviceSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeviceSessionError'
  }
}

/** The project ref out of a Supabase URL, for namespacing stored sessions. */
function projectRef(url: string): string {
  return new URL(url).hostname.split('.')[0]
}

function env(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Tudo que o painel `live` precisa, ou o nome do que está faltando. */
export function missingConfig(): string[] {
  const need: [string, string | undefined][] = [
    ['VITE_SUPABASE_URL', env('VITE_SUPABASE_URL')],
    ['VITE_SUPABASE_PUBLISHABLE_KEY', env('VITE_SUPABASE_PUBLISHABLE_KEY')],
    ['VITE_TENANT_ID', totemConfig.tenantId || undefined],
    ['VITE_TOTEM_DEVICE_EMAIL', env('VITE_TOTEM_DEVICE_EMAIL')],
    ['VITE_TOTEM_DEVICE_PASSWORD', env('VITE_TOTEM_DEVICE_PASSWORD')],
  ]
  return need.filter(([, value]) => !value).map(([name]) => name)
}

export function isDeviceConfigured(): boolean {
  return missingConfig().length === 0
}

/** The signed-in client, or a thrown error that says exactly what is missing. */
export async function deviceClient(): Promise<SupabaseClient> {
  const missing = missingConfig()
  if (missing.length > 0) {
    throw new DeviceSessionError(`Totem sem configuração: ${missing.join(', ')}.`)
  }

  client ??= createClient(env('VITE_SUPABASE_URL')!, env('VITE_SUPABASE_PUBLISHABLE_KEY')!, {
    auth: {
      // The panel is one long session on one machine. Persisting it means a
      // power cut does not need a human to type a password before the store
      // can sell again.
      persistSession: true,
      autoRefreshToken: true,
      // Namespaced by project ref. A bare 'chef-totem-device' is shared across
      // pools, so repointing VITE_SUPABASE_URL at another project hands the new
      // client a session minted by the old one — which reads as valid locally
      // and is rejected by every request. Supabase's own default key includes
      // the ref for this reason.
      storageKey: `chef-totem-device-${projectRef(env('VITE_SUPABASE_URL')!)}`,
    },
    global: {
      // O usuário do aparelho pode em princípio pertencer a mais de uma conta, e
      // `app.current_tenant_id()` responde NULL em vez de adivinhar. Dizer qual
      // é a diferença entre toda tela funcionar e toda tela vir vazia sem erro.
      //
      // Estes cabeçalhos NÃO podem chegar a uma edge function: as ~17 que ainda
      // carregam lista fixa de CORS recusam o preflight de qualquer cabeçalho
      // que não nomeiem. `totem-voice-token` escapa disso porque é chamada com
      // `fetch` direto (ver waiter/realtime-transport.ts), montando os próprios
      // cabeçalhos — quem passar a usar `functions.invoke` precisa de um cliente
      // sem estes.
      headers: {
        'x-fayz-tenant': totemConfig.tenantId,
        ...(totemConfig.unitId ? { 'x-fayz-unit': totemConfig.unitId } : {}),
      },
    },
  })

  signedIn ??= (async () => {
    // getSession() only reads storage — it never asks the server whether the
    // token is still good. A session can be stored and dead: the device
    // password was rotated (which revokes every refresh token), the user was
    // disabled, or the pool moved under us. Trusting it meant the panel
    // returned early, never signed in, and every request went out
    // unauthenticated — a 400 on refresh_token followed by 401 on everything,
    // with no way back short of clearing site data by hand.
    //
    // getUser() validates against the server, so a dead session fails here
    // rather than on the first query the customer is waiting for.
    const { data } = await client!.auth.getSession()
    if (data.session) {
      const { error: staleError } = await client!.auth.getUser()
      if (!staleError) return
      // Drop it locally: a revoked token cannot be signed out server-side, and
      // leaving it in storage means the next boot repeats this.
      await client!.auth.signOut({ scope: 'local' }).catch(() => {})
    }
    const { error } = await client!.auth.signInWithPassword({
      email: env('VITE_TOTEM_DEVICE_EMAIL')!,
      password: env('VITE_TOTEM_DEVICE_PASSWORD')!,
    })
    if (error) {
      // Sem isto uma senha errada envenena a promessa e o painel nunca mais
      // tenta entrar, nem depois de alguém corrigir o .env e recarregar.
      signedIn = null
      throw new DeviceSessionError(`Login do aparelho recusado: ${error.message}`)
    }
  })()

  await signedIn
  return client
}
