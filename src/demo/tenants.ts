import type { TotemTheme } from '@/design/theme'
import type { TotemCatalog } from '@/menu/types'

// ---------------------------------------------------------------------------
// Dois totens, um código.
//
// Este arquivo é o `fayz.totem.json` do plano do `@fayz-ai/kiosk` escrito à
// mão, antes do pacote existir. Ele é a prova de que a tese se sustenta: marca,
// paleta, tipografia, VOZ, cardápio e o jeito do assistente falar são dados —
// e trocar de restaurante é trocar um objeto, não um fork.
//
// O QUE NÃO ESTÁ AQUI, de propósito: tamanho de alvo de toque, folga entre
// alvos, altura da barra, a linha da zona de alcance. Isso é física de vidro a
// 82 DPI, não marca. Um tenant que quisesse "botões mais justos" estaria
// pedindo um painel em que as pessoas erram o toque.
//
// A PERSONALIDADE é mais que cor. A cafeteria trata por "você" com calma e
// pergunta se é para viagem; a pizzaria é curta, quente e trata o pedido como
// uma decisão. Mesma máquina de estados, duas pessoas diferentes atendendo.
// ---------------------------------------------------------------------------

export type DemoTenantId = 'cafe-sabor' | 'zedek'

/** Os textos que mudam de voz entre um restaurante e outro. */
export interface DemoCopy {
  attractCta: string
  modeTitle: string
  modeHere: string
  modeAway: string
  identifyTitle: string
  identifySubtitle: string
  menuTitle: string
  paymentTitle: string
  emptyCta: string
}

export interface DemoPersona {
  /** Como o assistente se apresenta. */
  name: string
  /** Um parágrafo que entra nas instruções e muda o jeito de falar. */
  voice: string
  /**
   * A VOZ da OpenAI Realtime. Nenhuma delas é nativa de português, então a
   * escolha aqui é de timbre e a de sotaque vem em `accent` — o modelo obedece
   * instrução de prosódia melhor do que se escolhe uma voz que não existe.
   */
  voiceId: 'alloy' | 'ash' | 'ballad' | 'cedar' | 'coral' | 'echo' | 'marin' | 'sage' | 'shimmer' | 'verse'
  /** Como o sotaque e o ritmo devem soar. Vai literal para as instruções. */
  accent: string
  /**
   * O ROTEIRO DE VENDA, na ordem.
   *
   * Sem isto o garçom responde bem e vende mal: ele espera o cliente lembrar
   * sozinho da bebida, e ninguém lembra. Cada linha é um passo que o modelo
   * segue na ordem — e a ordem é a diferença entre "qual tamanho?" antes de
   * saber o sabor (ruim: o cliente ainda não decidiu nada) e depois (certo: o
   * tamanho é a última coisa que falta).
   */
  playbook: string[]
  /** Aberturas tocáveis na faixa do assistente. */
  suggestions: string[]
}

export interface DemoTenant {
  id: DemoTenantId
  brand: { name: string; tagline: string }
  theme: Partial<TotemTheme>
  media: { posterUrl: string }
  copy: DemoCopy
  persona: DemoPersona
  catalog: TotemCatalog
}

// ---------------------------------------------------------------------------
// Café Sabor — cafeteria de bairro.
//
// Paleta quente e clara: creme, caramelo, verde-oliva. O "commit" é o verde e
// não um vermelho, porque numa cafeteria a compra não é um evento — é um hábito
// de manhã. Cantos generosos, tipografia com serifa no display: a cafeteria
// quer parecer feita à mão, não feita em escala.
// ---------------------------------------------------------------------------

const CAFE_EXTRAS = {
  id: 'cs-g-leite',
  name: 'Leite',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'cs-m-integral', name: 'Integral', surchargeCents: 0 },
    { id: 'cs-m-desnatado', name: 'Desnatado', surchargeCents: 0 },
    { id: 'cs-m-aveia', name: 'Aveia', surchargeCents: 300 },
    { id: 'cs-m-amendoas', name: 'Amêndoas', surchargeCents: 400 },
  ],
}

const CAFE_TOPPINGS = {
  id: 'cs-g-extras',
  name: 'Do jeito que você gosta',
  required: false,
  minSelections: 0,
  maxSelections: 3,
  modifiers: [
    { id: 'cs-m-dose', name: 'Dose extra de café', surchargeCents: 350 },
    { id: 'cs-m-canela', name: 'Canela', surchargeCents: 0 },
    { id: 'cs-m-caramelo', name: 'Calda de caramelo', surchargeCents: 250 },
    { id: 'cs-m-descafeinado', name: 'Descafeinado', surchargeCents: 0 },
  ],
}

export const CAFE_SABOR: DemoTenant = {
  id: 'cafe-sabor',
  brand: { name: 'Café Sabor', tagline: 'Torrado aqui, todo dia' },
  theme: {
    action: '#4D7C0F',
    ink: '#1C1917',
    surface: '#FFFFFF',
    page: '#F6F1E7',
    accent: '#B45309',
    edge: '#78716C',
    displayFont: "'Archivo', system-ui, sans-serif",
    bodyFont: "'Archivo', system-ui, sans-serif",
    radius: 34,
  },
  media: { posterUrl: '/demo/cafe-sabor/attract.jpg' },
  copy: {
    attractCta: 'Toque e peça seu café',
    modeTitle: 'Vai ficar com a gente?',
    modeHere: 'Fico aqui',
    modeAway: 'Para viagem',
    identifyTitle: 'Seu telefone,\ne a gente lembra',
    identifySubtitle: 'Crédito, o café do clube e o recibo no WhatsApp. Fica a seu critério.',
    menuTitle: 'O que te apetece?',
    paymentTitle: 'Como prefere pagar?',
    emptyCta: 'Escolha algo gostoso',
  },
  persona: {
    name: 'Bia',
    voice: [
      'Você é a Bia, barista do Café Sabor. Trate o cliente com calma, como quem',
      'já viu ele outras vezes. Fale de café com intimidade sem virar aula: se',
      'perguntarem o que é um flat white, responda em uma frase.',
      'Se a pessoa parecer com pressa, encurte: nome do café, leite, pronto.',
    ].join(' '),
    voiceId: 'coral',
    accent: [
      'Português do Brasil, sotaque paulistano neutro, voz feminina, ritmo calmo.',
      'Diga os "de" e "para" completos, sem engolir sílaba. "Você", nunca "tu".',
      'Preços em reais lidos por extenso: "quatorze reais", não "R$ 14,00".',
    ].join(' '),
    playbook: [
      'BEBIDA PRIMEIRO. Descubra qual café antes de qualquer outra coisa — é a decisão que o cliente veio tomar.',
      'Só então pergunte o leite, e ofereça as alternativas de uma vez: "integral, desnatado, aveia ou amêndoas?".',
      'Ofereça o acompanhamento UMA vez, nomeando um item concreto ("um pão de queijo saindo agora?"). Se recusarem, não insista.',
      'Se ele tem crédito ou oferta do clube, diga na hora de fechar — não no começo, que soa a vendedor.',
      'Antes de ir para o pagamento, pergunte se é para viagem SÓ se ainda não estiver escolhido.',
      'Fechou? Leve para o pagamento sem mais perguntas.',
    ],
    suggestions: ['Qual café você recomenda?', 'Tem algo sem lactose?'],
  },
  catalog: {
    categories: [
      { id: 'cs-c-cafes', name: 'Cafés', sortOrder: 1 },
      { id: 'cs-c-quitutes', name: 'Quitutes', sortOrder: 2 },
      { id: 'cs-c-doces', name: 'Doces', sortOrder: 3 },
      { id: 'cs-c-geladas', name: 'Geladas', sortOrder: 4 },
    ],
    products: [
      {
        id: 'cs-p-espresso',
        categoryId: 'cs-c-cafes',
        name: 'Espresso duplo',
        description: 'Grão da casa, torra média. Curto e denso.',
        priceCents: 900,
        imageUrl: '/demo/cafe-sabor/espresso.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: [CAFE_TOPPINGS],
      },
      {
        id: 'cs-p-cappuccino',
        categoryId: 'cs-c-cafes',
        name: 'Cappuccino',
        description: 'Espuma sedosa, sem canela — a não ser que você peça.',
        priceCents: 1400,
        imageUrl: '/demo/cafe-sabor/cappuccino.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: [CAFE_EXTRAS, CAFE_TOPPINGS],
      },
      {
        id: 'cs-p-latte',
        categoryId: 'cs-c-cafes',
        name: 'Latte de caramelo',
        description: 'Gelado, com calda feita na casa.',
        priceCents: 1600,
        compareAtCents: 1900,
        imageUrl: '/demo/cafe-sabor/latte-caramelo.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [CAFE_EXTRAS, CAFE_TOPPINGS],
      },
      {
        id: 'cs-p-pao-queijo',
        categoryId: 'cs-c-quitutes',
        name: 'Pão de queijo',
        description: 'Porção com quatro, direto do forno.',
        priceCents: 1200,
        imageUrl: '/demo/cafe-sabor/pao-de-queijo.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'cs-p-croissant',
        categoryId: 'cs-c-quitutes',
        name: 'Croissant de amêndoas',
        description: 'Massa folhada de três dias.',
        priceCents: 1800,
        imageUrl: '/demo/cafe-sabor/croissant.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'cs-p-bolo-fuba',
        categoryId: 'cs-c-doces',
        name: 'Bolo de fubá com goiabada',
        description: 'Fatia generosa, receita da avó da Bia.',
        priceCents: 1400,
        imageUrl: '/demo/cafe-sabor/bolo-fuba.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'cs-p-cheesecake',
        categoryId: 'cs-c-doces',
        name: 'Cheesecake de frutas vermelhas',
        description: 'Base de castanha, calda de amora.',
        priceCents: 2200,
        imageUrl: '/demo/cafe-sabor/cheesecake.jpg',
        // Um item esgotado é obrigatório num cardápio de demonstração: é o
        // estado que o design tem de saber mostrar sem parecer defeito.
        soldOut: true,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'cs-p-limonada',
        categoryId: 'cs-c-geladas',
        name: 'Limonada suíça',
        description: 'Batida na hora, com casca.',
        priceCents: 1300,
        imageUrl: '/demo/cafe-sabor/limonada.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Zedek — pizzaria napolitana.
//
// Paleta noturna: carvão, tijolo, dourado. Fundo escuro, e é aqui que o
// contraste vira decisão de engenharia, não de gosto: com a página escura, o
// `ink` (que é a cor do TEXTO sobre cartão) continua escuro, mas `page` passa a
// ser quase preto. As checagens de `checkTheme` cobrem exatamente esse par.
//
// Cantos quase retos e display condensado: a pizzaria quer parecer forno, não
// padaria.
// ---------------------------------------------------------------------------

const PIZZA_SIZE = {
  id: 'zd-g-tamanho',
  name: 'Tamanho',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'zd-m-individual', name: 'Individual 25cm', surchargeCents: 0 },
    { id: 'zd-m-media', name: 'Média 30cm', surchargeCents: 800 },
    { id: 'zd-m-grande', name: 'Grande 35cm', surchargeCents: 1600 },
  ],
}

// Meio a meio existe no CARDÁPIO, não só no roteiro. Instruir o garçom a
// oferecer uma coisa que o cardápio não sabe fazer é ensiná-lo a mentir — e é
// no caixa que a mentira aparece.
const PIZZA_HALF = {
  id: 'zd-g-meio',
  name: 'Meio a meio',
  required: false,
  minSelections: 0,
  maxSelections: 1,
  modifiers: [
    { id: 'zd-m-meio-margherita', name: 'Metade Margherita', surchargeCents: 0 },
    { id: 'zd-m-meio-pepperoni', name: 'Metade Pepperoni', surchargeCents: 400 },
    { id: 'zd-m-meio-4queijos', name: 'Metade Quatro queijos', surchargeCents: 600 },
    { id: 'zd-m-meio-diavola', name: 'Metade Diavola', surchargeCents: 700 },
  ],
}

const PIZZA_EXTRAS = {
  id: 'zd-g-extras',
  name: 'Adicionais',
  required: false,
  minSelections: 0,
  maxSelections: 4,
  modifiers: [
    { id: 'zd-m-burrata', name: 'Burrata', surchargeCents: 900 },
    { id: 'zd-m-nduja', name: "'Nduja picante", surchargeCents: 700 },
    { id: 'zd-m-mel', name: 'Mel picante', surchargeCents: 600 },
    { id: 'zd-m-sem-cebola', name: 'Sem cebola', surchargeCents: 0 },
  ],
}

export const ZEDEK: DemoTenant = {
  id: 'zedek',
  brand: { name: 'Zedek', tagline: 'Forno a lenha desde 1998' },
  theme: {
    action: '#C2410C',
    ink: '#0C0A09',
    surface: '#FFFFFF',
    page: '#EDE9E4',
    accent: '#B91C1C',
    edge: '#57534E',
    displayFont: "'Anton', Impact, sans-serif",
    bodyFont: "'Archivo', system-ui, sans-serif",
    radius: 12,
  },
  media: { posterUrl: '/demo/zedek/attract.jpg' },
  copy: {
    attractCta: 'Toque para pedir',
    modeTitle: 'Come aqui ou leva?',
    modeHere: 'Como aqui',
    modeAway: 'Levo comigo',
    identifyTitle: 'Telefone?\nA gente te acha',
    identifySubtitle: 'Crédito, promo do clube e a senha no WhatsApp. Não precisa.',
    menuTitle: 'Qual vai ser?',
    paymentTitle: 'Como vai pagar?',
    emptyCta: 'Escolha uma pizza',
  },
  persona: {
    name: 'Téo',
    voice: [
      'Você é o Téo, do salão do Zedek. Fale curto e quente, como quem conhece o',
      'forno: "essa sai em oito minutos", "essa é a mais pedida hoje".',
      'Não enrole — na pizzaria a fila anda. Se pedirem recomendação, dê UMA e',
      'diga por quê em meia frase.',
    ].join(' '),
    voiceId: 'ash',
    accent: [
      'Português do Brasil, sotaque paulistano de bairro, voz masculina, ritmo rápido.',
      'Pode usar "meu", "fechou", "tá certo" — sem exagerar na gíria.',
      'Preços em reais lidos por extenso: "cinquenta e nove reais", não "R$ 59,00".',
    ].join(' '),
    playbook: [
      'SABOR PRIMEIRO, sempre. Nunca comece perguntando o tamanho: o cliente ainda não escolheu nada, e tamanho sem sabor é uma pergunta sobre o vazio.',
      'Escolhido o sabor, ofereça MEIO A MEIO uma vez: "quer inteira ou meia a meia com outro sabor?". Se aceitar, marque a opção de meio a meio e pergunte o segundo sabor.',
      'Aí sim o tamanho, com os três de uma vez e o preço da diferença: "individual, média ou grande?".',
      'Se a pizza escolhida está em PROMOÇÃO (preço riscado), diga o quanto economiza — uma frase, na hora de confirmar.',
      'Adicionado? Ofereça BEBIDA nomeando uma: "um chopp gelado com ela?". Uma vez só.',
      'Se ele aceitou bebida ou recusou, ofereça a sobremesa UMA vez. Depois pare de oferecer.',
      'Se ele tem crédito ou oferta do clube, diga na hora de fechar.',
      'Fechou? Leve para o pagamento.',
    ],
    suggestions: ['Qual a mais pedida?', 'Tem alguma sem carne?'],
  },
  catalog: {
    categories: [
      { id: 'zd-c-pizzas', name: 'Pizzas', sortOrder: 1 },
      { id: 'zd-c-calzones', name: 'Calzones', sortOrder: 2 },
      { id: 'zd-c-bebidas', name: 'Bebidas', sortOrder: 3 },
      { id: 'zd-c-sobremesas', name: 'Sobremesas', sortOrder: 4 },
    ],
    products: [
      {
        id: 'zd-p-margherita',
        categoryId: 'zd-c-pizzas',
        name: 'Margherita',
        description: 'San Marzano, mozzarella di bufala, manjericão.',
        priceCents: 5500,
        imageUrl: '/demo/zedek/margherita.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-pepperoni',
        categoryId: 'zd-c-pizzas',
        name: 'Pepperoni',
        description: 'Pepperoni que encaracola, muçarela e orégano.',
        priceCents: 5900,
        compareAtCents: 6900,
        imageUrl: '/demo/zedek/pepperoni.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-quatro-queijos',
        categoryId: 'zd-c-pizzas',
        name: 'Quatro queijos',
        description: 'Gorgonzola, provolone, parmesão e muçarela.',
        priceCents: 6600,
        imageUrl: '/demo/zedek/quatro-queijos.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-diavola',
        categoryId: 'zd-c-pizzas',
        name: 'Diavola',
        description: 'Salame picante, pimenta calabresa e mel.',
        priceCents: 6800,
        imageUrl: '/demo/zedek/diavola.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-burrata',
        categoryId: 'zd-c-pizzas',
        name: 'Burrata e presunto cru',
        description: 'Montada depois do forno, com rúcula.',
        priceCents: 7900,
        imageUrl: '/demo/zedek/burrata.jpg',
        soldOut: true,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-calzone',
        categoryId: 'zd-c-calzones',
        name: 'Calzone de presunto e ricota',
        description: 'Fechado no forno, sai fumegando.',
        priceCents: 5800,
        imageUrl: '/demo/zedek/calzone.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_EXTRAS],
      },
      {
        id: 'zd-p-chopp',
        categoryId: 'zd-c-bebidas',
        name: 'Chopp da casa 500ml',
        description: 'Lager leve, tirado na hora.',
        priceCents: 2200,
        imageUrl: '/demo/zedek/chopp.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'zd-p-refri',
        categoryId: 'zd-c-bebidas',
        name: 'Refrigerante 350ml',
        description: 'Gelado de verdade.',
        priceCents: 800,
        imageUrl: '/demo/zedek/refrigerante.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'zd-p-tiramisu',
        categoryId: 'zd-c-sobremesas',
        name: 'Tiramisù',
        description: 'Mascarpone, café e cacau. Feito de manhã.',
        priceCents: 2600,
        imageUrl: '/demo/zedek/tiramisu.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
    ],
  },
}

export const DEMO_TENANTS: Record<DemoTenantId, DemoTenant> = {
  'cafe-sabor': CAFE_SABOR,
  zedek: ZEDEK,
}

export const DEMO_TENANT_IDS = Object.keys(DEMO_TENANTS) as DemoTenantId[]

/**
 * Qual dos dois está no ar.
 *
 * `?tenant=zedek` na URL ganha do `.env`, e é assim de propósito: numa feira
 * ninguém reinicia um servidor de dev para mostrar o segundo restaurante. É a
 * mesma costura de `?waiter=scripted` e `?design`.
 */
export function activeDemoTenant(): DemoTenant {
  const fromUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tenant')
      : null
  const fromEnv = import.meta.env.VITE_TOTEM_DEMO_TENANT
  const id = (fromUrl ?? fromEnv) as DemoTenantId | null

  return id && id in DEMO_TENANTS ? DEMO_TENANTS[id] : ZEDEK
}
