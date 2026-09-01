import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

function env(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function isDeviceConfigured(): boolean {
  return Boolean(
    env('VITE_SUPABASE_URL') &&
      env('VITE_SUPABASE_PUBLISHABLE_KEY') &&
      env('VITE_TOTEM_DEVICE_EMAIL') &&
      env('VITE_TOTEM_DEVICE_PASSWORD'),
  )
}

/** The signed-in client, or a thrown error that says exactly what is missing. */
export async function deviceClient(): Promise<SupabaseClient> {
  const url = env('VITE_SUPABASE_URL')
  const key = env('VITE_SUPABASE_PUBLISHABLE_KEY')
  const email = env('VITE_TOTEM_DEVICE_EMAIL')
  const password = env('VITE_TOTEM_DEVICE_PASSWORD')

  if (!url || !key) throw new DeviceSessionError('Totem sem VITE_SUPABASE_URL/PUBLISHABLE_KEY.')
  if (!email || !password) {
    throw new DeviceSessionError(
      'Totem sem credencial de aparelho (VITE_TOTEM_DEVICE_EMAIL/PASSWORD).',
    )
  }

  client ??= createClient(url, key, {
    auth: {
      // The panel is one long session on one machine. Persisting it means a
      // power cut does not need a human to type a password before the store
      // can sell again.
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'chef-totem-device',
    },
  })

  signedIn ??= (async () => {
    const { data } = await client!.auth.getSession()
    if (data.session) return
    const { error } = await client!.auth.signInWithPassword({ email, password })
    if (error) throw new DeviceSessionError(`Login do aparelho recusado: ${error.message}`)
  })()

  await signedIn
  return client
}
