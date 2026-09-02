// ---------------------------------------------------------------------------
// A chave efêmera da sessão de voz do totem.
//
// A chave da OpenAI NÃO pode estar no bundle. O painel fica numa praça de
// alimentação, o DevTools de qualquer celular alcança o JavaScript dele, e uma
// chave de plataforma vazada é a conta inteira, não um totem.
//
// Então o painel pede aqui, autenticado como o aparelho (a mesma sessão de
// device que lê o cardápio e grava o pedido), e recebe de volta um segredo que
// vale um minuto e só serve para abrir UMA sessão de Realtime.
//
// `verify_jwt` fica LIGADO nesta função: sem isso ela vira um distribuidor
// anônimo de minutos de GPT pago pelo lojista.
// ---------------------------------------------------------------------------

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')
const MODEL = Deno.env.get('TOTEM_REALTIME_MODEL') ?? 'gpt-realtime-2.1'
const VOICE = Deno.env.get('TOTEM_REALTIME_VOICE') ?? 'marin'

// A lista de origens é fixa e curta: um totem tem endereço conhecido. Deixar
// `*` aqui é deixar qualquer página da internet gastar a cota do lojista.
const ALLOWED = (Deno.env.get('TOTEM_ALLOWED_ORIGINS') ?? 'http://localhost:5310,http://localhost:5311')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0]
  return {
    'Access-Control-Allow-Origin': allow,
    // Toda vez que o cliente ganha um cabeçalho novo e esta lista não, as ~20
    // funções do pool quebram no preflight e o log fica mudo. Ver a armadilha
    // registrada em edge-function-preflight-trap.
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: 'openai_key_missing' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let body: { instructions?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Sem corpo é legítimo: as instruções são opcionais.
  }

  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Um minuto é de sobra para o handshake e curto o bastante para que um
      // segredo capturado não valha nada.
      expires_after: { anchor: 'created_at', seconds: 60 },
      session: {
        type: 'realtime',
        model: MODEL,
        audio: { output: { voice: VOICE } },
        ...(body.instructions ? { instructions: body.instructions } : {}),
      },
    }),
  })

  const text = await upstream.text()
  if (!upstream.ok) {
    console.error('[totem-voice-token] upstream', upstream.status, text.slice(0, 500))
    return new Response(JSON.stringify({ error: 'upstream', status: upstream.status }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const data = JSON.parse(text) as { value?: string; expires_at?: number }
  return new Response(JSON.stringify({ value: data.value, expires_at: data.expires_at, model: MODEL }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
