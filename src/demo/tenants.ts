import type { TotemTheme } from '@/design/theme'
import type { TotemCatalog, TotemModifierGroup } from '@/menu/types'
import { burgerRemovalOptions } from '@/burger/composition'
import type { BurgerRecipeId } from '@/burger/types'

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

export type DemoTenantId = 'cafe-sabor' | 'pizza-house' | 'maxburger'

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

// O matcha não usa o mesmo grupo de extras do café, e isso não é preciosismo:
// `CAFE_TOPPINGS` oferece "dose extra de café" e "descafeinado", e as duas são
// perguntas sobre uma coisa que não está na xícara. É a mesma regra do ponto da
// carne no frango empanado do MaxBurger — um grupo que não se aplica ensina o
// cliente que as perguntas do painel são decorativas.
const CAFE_MATCHA_TOPPINGS = {
  id: 'cs-g-matcha-extras',
  name: 'Do jeito que você gosta',
  required: false,
  minSelections: 0,
  maxSelections: 2,
  modifiers: [
    { id: 'cs-m-matcha-dose', name: 'Dose extra de matcha', surchargeCents: 400 },
    { id: 'cs-m-matcha-baunilha', name: 'Baunilha', surchargeCents: 250 },
    { id: 'cs-m-matcha-mel', name: 'Mel', surchargeCents: 200 },
  ],
}

export const CAFE_SABOR: DemoTenant = {
  id: 'cafe-sabor',
  brand: { name: 'Café Sabor', tagline: 'Torrado aqui, todo dia' },
  theme: {
    action: '#4D7C0F',
    onAction: '#FFFFFF',
    ink: '#1C1917',
    surface: '#FFFFFF',
    page: '#F6F1E7',
    accent: '#B45309',
    edge: '#78716C',
    displayFont: "'Archivo', system-ui, sans-serif",
    bodyFont: "'Archivo', system-ui, sans-serif",
    // A ÚNICA casa que não escreve o título em caixa alta. Uma cafeteria que
    // quer parecer feita à mão não pinta BOLO DE FUBÁ na parede — e ver a
    // mesma tela com e sem isto é o argumento inteiro de por que a caixa do
    // display é marca e não decoração.
    displayCase: 'none',
    displayTracking: '-0.01em',
    radius: 34,
    elevation: 'soft',
    // O vidro mais ESPESSO das três casas. 26px de desfoque deixam passar cor e
    // não deixam passar desenho: quem está atrás do chip vira uma mancha quente
    // de caramelo, que é exatamente o que uma cafeteria quer atrás de um menu
    // escrito à mão. A tonalidade é o caramelo do `accent`, não o verde de
    // commit — o verde já é o botão, e uma casa em que o material e a ação têm
    // a mesma cor é uma casa onde nada chama atenção.
    glassTint: '#B45309',
    glassBlur: 26,
    glassOpacity: 0.72,
    logoUrl: '/demo/cafe-sabor/logo.png',
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
      'Se pedirem algo sem café ou "mais leve", ofereça o MATCHA nomeando: "um matcha latte?". A casa faz quente e gelado.',
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
        id: 'cs-p-matcha-latte',
        categoryId: 'cs-c-cafes',
        name: 'Matcha latte',
        description: 'Cerimonial peneirado e batido na hora, sem açúcar.',
        priceCents: 1700,
        imageUrl: '/demo/cafe-sabor/matcha-latte.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: [CAFE_EXTRAS, CAFE_MATCHA_TOPPINGS],
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
        id: 'cs-p-matcha-gelado',
        categoryId: 'cs-c-geladas',
        name: 'Matcha gelado',
        description: 'Com leite gelado e gelo picado. Verde de verdade.',
        priceCents: 1800,
        imageUrl: '/demo/cafe-sabor/matcha-gelado.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [CAFE_EXTRAS, CAFE_MATCHA_TOPPINGS],
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
// Pizza House — pizzaria napolitana.
//
// Paleta noturna: carvão, tijolo, dourado. Fundo escuro, e é aqui que o
// contraste vira decisão de engenharia, não de gosto: com a página escura, o
// `ink` (que é a cor do TEXTO sobre cartão) continua escuro, mas `page` passa a
// ser quase preto. As checagens de `checkTheme` cobrem exatamente esse par.
//
// Cantos quase retos e display condensado: a pizzaria quer parecer forno, não
// padaria.
// ---------------------------------------------------------------------------

const PIZZA_SIZE: TotemModifierGroup = {
  kind: 'pizza-size',
  id: 'ph-g-tamanho',
  name: 'Tamanho',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'ph-m-individual', name: 'Individual 25cm', surchargeCents: 0, pizzaDiameterCm: 25 },
    { id: 'ph-m-media', name: 'Média 30cm', surchargeCents: 800, pizzaDiameterCm: 30 },
    { id: 'ph-m-grande', name: 'Grande 35cm', surchargeCents: 1600, pizzaDiameterCm: 35 },
  ],
}

// Meio a meio existe no CARDÁPIO, não só no roteiro. Instruir o garçom a
// oferecer uma coisa que o cardápio não sabe fazer é ensiná-lo a mentir — e é
// no caixa que a mentira aparece.
const PIZZA_HALF: TotemModifierGroup = {
  kind: 'pizza-half',
  id: 'ph-g-meio',
  name: 'Meio a meio',
  required: false,
  minSelections: 0,
  maxSelections: 1,
  modifiers: [
    { id: 'ph-m-meio-margherita', name: 'Metade Margherita', surchargeCents: 0, pizzaFlavor: { productId: 'ph-p-margherita', name: 'Margherita', imageUrl: '/demo/pizza-house/pizza/margherita.webp' } },
    { id: 'ph-m-meio-pepperoni', name: 'Metade Pepperoni', surchargeCents: 400, pizzaFlavor: { productId: 'ph-p-pepperoni', name: 'Pepperoni', imageUrl: '/demo/pizza-house/pizza/pepperoni.webp' } },
    { id: 'ph-m-meio-4queijos', name: 'Metade Quatro queijos', surchargeCents: 600, pizzaFlavor: { productId: 'ph-p-quatro-queijos', name: 'Quatro queijos', imageUrl: '/demo/pizza-house/pizza/quatro-queijos.webp' } },
    { id: 'ph-m-meio-diavola', name: 'Metade Diavola', surchargeCents: 700, pizzaFlavor: { productId: 'ph-p-diavola', name: 'Diavola', imageUrl: '/demo/pizza-house/pizza/diavola.webp' } },
    { id: 'ph-m-meio-calabresa', name: 'Metade Calabresa', surchargeCents: 400, pizzaFlavor: { productId: 'ph-p-calabresa', name: 'Calabresa', imageUrl: '/demo/pizza-house/pizza/calabresa.webp' } },
  ],
}

const PIZZA_EXTRAS: TotemModifierGroup = {
  kind: 'pizza-extras',
  id: 'ph-g-extras',
  name: 'Adicionais',
  required: false,
  minSelections: 0,
  maxSelections: 4,
  modifiers: [
    { id: 'ph-m-burrata', name: 'Burrata', surchargeCents: 900 },
    { id: 'ph-m-nduja', name: "'Nduja picante", surchargeCents: 700 },
    { id: 'ph-m-mel', name: 'Mel picante', surchargeCents: 600 },
    { id: 'ph-m-sem-cebola', name: 'Sem cebola', surchargeCents: 0 },
  ],
}

export const PIZZA_HOUSE: DemoTenant = {
  id: 'pizza-house',
  brand: { name: 'Pizza House', tagline: 'Forno a lenha desde 1998' },
  theme: {
    action: '#C2410C',
    onAction: '#FFFFFF',
    ink: '#0C0A09',
    surface: '#FFFFFF',
    page: '#EDE9E4',
    accent: '#B91C1C',
    edge: '#57534E',
    displayFont: "'Anton', Impact, sans-serif",
    bodyFont: "'Archivo', system-ui, sans-serif",
    displayCase: 'upper',
    // Mais apertado que o padrão: Anton condensado com as letras encostando é
    // a tipografia de cartaz de pizzaria, e o título ocupa a largura inteira.
    displayTracking: '-0.03em',
    // 12px contra os 34px da cafeteria: quase reto é forno e cartaz; redondo é
    // padaria. O raio é o token que mais muda a cara da grade de cartões.
    radius: 12,
    elevation: 'soft',
    // Metade do desfoque da cafeteria e bem mais transparente: aqui o vidro tem
    // de DEIXAR VER o forno atrás dele. É uma casa noturna, o fundo é o
    // argumento de venda, e um vidro leitoso na frente de uma foto de brasa
    // joga fora a foto. A tonalidade é o tijolo da própria marca, então o que
    // atravessa a pane sai um grau mais quente do que entrou.
    glassTint: '#C2410C',
    glassBlur: 14,
    glassOpacity: 0.6,
    logoUrl: '/demo/pizza-house/logo.png',
  },
  media: { posterUrl: '/demo/pizza-house/attract.jpg' },
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
      'Você é o Téo, do salão da Pizza House. Fale curto e quente, como quem conhece o',
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
      { id: 'ph-c-pizzas', name: 'Pizzas', sortOrder: 1 },
      { id: 'ph-c-calzones', name: 'Calzones', sortOrder: 2 },
      { id: 'ph-c-bebidas', name: 'Bebidas', sortOrder: 3 },
      { id: 'ph-c-sobremesas', name: 'Sobremesas', sortOrder: 4 },
    ],
    products: [
      {
        id: 'ph-p-margherita',
        categoryId: 'ph-c-pizzas',
        name: 'Margherita',
        description: 'San Marzano, mozzarella di bufala, manjericão.',
        priceCents: 5500,
        imageUrl: '/demo/pizza-house/pizza/margherita.webp',
        pizza: { imageUrl: '/demo/pizza-house/pizza/margherita.webp' },
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-pepperoni',
        categoryId: 'ph-c-pizzas',
        name: 'Pepperoni',
        description: 'Pepperoni que encaracola, muçarela e orégano.',
        priceCents: 5900,
        compareAtCents: 6900,
        imageUrl: '/demo/pizza-house/pizza/pepperoni.webp',
        pizza: { imageUrl: '/demo/pizza-house/pizza/pepperoni.webp' },
        soldOut: false,
        featured: true,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-quatro-queijos',
        categoryId: 'ph-c-pizzas',
        name: 'Quatro queijos',
        description: 'Gorgonzola, provolone, parmesão e muçarela.',
        priceCents: 6600,
        imageUrl: '/demo/pizza-house/pizza/quatro-queijos.webp',
        pizza: { imageUrl: '/demo/pizza-house/pizza/quatro-queijos.webp' },
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-diavola',
        categoryId: 'ph-c-pizzas',
        name: 'Diavola',
        description: 'Salame picante, pimenta calabresa e mel.',
        priceCents: 6800,
        imageUrl: '/demo/pizza-house/pizza/diavola.webp',
        pizza: { imageUrl: '/demo/pizza-house/pizza/diavola.webp' },
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-burrata',
        categoryId: 'ph-c-pizzas',
        name: 'Burrata e presunto cru',
        description: 'Montada depois do forno, com rúcula.',
        priceCents: 7900,
        imageUrl: '/demo/pizza-house/burrata.jpg',
        soldOut: true,
        featured: false,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-calabresa',
        categoryId: 'ph-c-pizzas',
        name: 'Calabresa',
        description: 'Calabresa dourada, muçarela, cebola fina e orégano.',
        priceCents: 5900,
        imageUrl: '/demo/pizza-house/pizza/calabresa.webp',
        pizza: { imageUrl: '/demo/pizza-house/pizza/calabresa.webp', defaultForAssembly: true },
        soldOut: false,
        featured: true,
        modifierGroups: [PIZZA_SIZE, PIZZA_HALF, PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-calzone',
        categoryId: 'ph-c-calzones',
        name: 'Calzone de presunto e ricota',
        description: 'Fechado no forno, sai fumegando.',
        priceCents: 5800,
        imageUrl: '/demo/pizza-house/calzone.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [PIZZA_EXTRAS],
      },
      {
        id: 'ph-p-chopp',
        categoryId: 'ph-c-bebidas',
        name: 'Chopp da casa 500ml',
        description: 'Lager leve, tirado na hora.',
        priceCents: 2200,
        imageUrl: '/demo/pizza-house/chopp.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'ph-p-refri',
        categoryId: 'ph-c-bebidas',
        name: 'Refrigerante 350ml',
        description: 'Gelado de verdade.',
        priceCents: 800,
        imageUrl: '/demo/pizza-house/refrigerante.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'ph-p-tiramisu',
        categoryId: 'ph-c-sobremesas',
        name: 'Tiramisù',
        description: 'Mascarpone, café e cacau. Feito de manhã.',
        priceCents: 2600,
        imageUrl: '/demo/pizza-house/tiramisu.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// MaxBurger — lanchonete de chapa.
//
// A terceira casa existe para quebrar o sistema de propósito. As duas
// primeiras são variações de uma mesma ideia: página clara, tinta escura,
// botão de commit num tom quente, sombra difusa. Nenhuma delas provava que o
// tema aguenta uma marca que trabalha ao contrário.
//
// AQUI O BOTÃO DE PAGAR É AMARELO. Isso era impossível até agora, e a
// impossibilidade estava escrita no código: `text-white` fixo no `TotemButton`
// e `contrast(action, surface)` no `checkTheme` — os dois presumindo que a
// tinta sobre a cor de ação é branca. Amarelo com texto branco dá 1,7:1, ou
// seja, um botão de PAGAR ilegível a um metro de distância. Com `onAction`
// como token, o amarelo entra com tinta quase preta e mede 11,9:1.
//
// E a ELEVAÇÃO é `hard`: deslocamento sólido, sem desfoque, na cor da tinta. É
// a sombra de placa esmaltada e de adesivo — a lanchonete não quer parecer
// cuidada, quer parecer impressa. Vista de longe, é isso que distingue esta
// casa das outras duas antes de a pessoa ler uma palavra.
// ---------------------------------------------------------------------------

// Ponto da carne é do BLEND, então o frango e o veggie não têm o grupo. Um
// obrigatório que não se aplica é um pedágio: o cliente escolhe "ao ponto" num
// filé empanado e aprende que as perguntas do painel são decorativas.
const BURGER_PONTO: TotemModifierGroup = {
  kind: 'burger-point',
  id: 'mb-g-ponto',
  name: 'Ponto da carne',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'mb-m-ponto', name: 'Ao ponto', surchargeCents: 0 },
    { id: 'mb-m-ponto-menos', name: 'Ao ponto para menos', surchargeCents: 0 },
    { id: 'mb-m-bem-passado', name: 'Bem passado', surchargeCents: 0 },
  ],
}

const BURGER_PAO: TotemModifierGroup = {
  kind: 'burger-bread',
  id: 'mb-g-pao',
  name: 'Pão',
  required: true,
  minSelections: 1,
  maxSelections: 1,
  modifiers: [
    { id: 'mb-m-brioche', name: 'Brioche', surchargeCents: 0, burgerEffect: { kind: 'bread', bread: 'brioche' } },
    { id: 'mb-m-australiano', name: 'Australiano', surchargeCents: 300, burgerEffect: { kind: 'bread', bread: 'australian' } },
    { id: 'mb-m-sem-gluten', name: 'Sem glúten', surchargeCents: 500, burgerEffect: { kind: 'bread', bread: 'gluten-free' } },
  ],
}

// O COMBO mora no cardápio, não só no roteiro do atendente. É a mesma regra
// que fez o meio a meio da Pizza House virar grupo: instruir o assistente a
// oferecer uma coisa que o cardápio não sabe fazer é ensiná-lo a mentir, e a
// mentira aparece no caixa.
const BURGER_COMBO: TotemModifierGroup = {
  kind: 'burger-combo',
  id: 'mb-g-combo',
  name: 'Vira combo?',
  required: false,
  minSelections: 0,
  maxSelections: 1,
  modifiers: [
    { id: 'mb-m-combo', name: 'Fritas + refrigerante', surchargeCents: 1600 },
    { id: 'mb-m-combo-max', name: 'Fritas grandes + milkshake', surchargeCents: 2400 },
  ],
}

const BURGER_EXTRAS: TotemModifierGroup = {
  kind: 'burger-extras',
  id: 'mb-g-extras',
  name: 'Manda mais',
  required: false,
  minSelections: 0,
  maxSelections: 4,
  modifiers: [
    { id: 'mb-m-bacon', name: 'Bacon', surchargeCents: 600, burgerEffect: { kind: 'extra', asset: 'bacon' } },
    { id: 'mb-m-cheddar', name: 'Cheddar extra', surchargeCents: 400, burgerEffect: { kind: 'extra', asset: 'cheddar' } },
    { id: 'mb-m-ovo', name: 'Ovo', surchargeCents: 300, burgerEffect: { kind: 'extra', asset: 'egg' } },
  ],
}

function burgerGroups(productId: string, recipe: BurgerRecipeId): TotemModifierGroup[] {
  const removals = burgerRemovalOptions(productId, recipe)
  return [BURGER_PAO, ...(['chicken', 'veggie'].includes(recipe) ? [] : [BURGER_PONTO]), BURGER_EXTRAS, BURGER_COMBO,
    ...(removals.length ? [{ id: `${productId}-removals`, kind: 'burger-removals' as const, name: 'Retirar ingredientes',
      required: false, minSelections: 0, maxSelections: removals.length, modifiers: removals }] : [])]
}

export const MAXBURGER: DemoTenant = {
  id: 'maxburger',
  brand: { name: 'MaxBurger', tagline: 'Na chapa, do jeito que você manda' },
  theme: {
    action: '#FACC15',
    // 12,4:1 contra o amarelo. Branco daria 1,7:1 — ver o comentário do bloco.
    onAction: '#18181B',
    // E como TEXTO o amarelo não serve de jeito nenhum: 1,6:1 sobre o cartão
    // branco, no elemento que mais decide a compra, que é o preço. O vermelho
    // da mesma marca dá 4,84:1 e continua sendo a casa.
    actionInk: '#DC2626',
    ink: '#18181B',
    surface: '#FFFFFF',
    // NEUTRO FRIO, e foi daqui que a casa saiu do vintage.
    //
    // Ela era `#FEF3C7`, um creme francamente amarelo — e creme é formica, é
    // lanchonete de estrada, é metade do vocabulário dos anos 50. Sobre creme
    // quente o vidro não parece vidro: parece plástico amarelado, porque o
    // material inteiro herda a temperatura do que está atrás dele. Num neutro
    // frio o mesmo vidro volta a parecer vidro, e o amarelo da marca — que
    // FICA, porque não era ele o vintage — passa a ler como cor de sinal em vez
    // de cor de parede.
    page: '#F5F5F7',
    accent: '#DC2626',
    // Cinza frio no lugar do cinza-pedra quente: a borda de um controle vazado
    // é a coisa mais próxima do fundo que existe, e uma borda quente sobre uma
    // página fria é a única peça da tela que denuncia de onde a casa veio.
    edge: '#52525B',
    // ARCHIVO EM CAIXA ALTA, e não mais Anton.
    //
    // Anton é display condensado de CARTAZ, e cartaz é o vocabulário da
    // pizzaria — que já o usa, apertado. Numa lanchonete nova ele lia como
    // letreiro antigo. Archivo em caixa alta com peso alto e espaçamento aberto
    // é sans moderna, e é o que uma marca de hambúrguer abriria hoje.
    //
    // As três assinaturas continuam distintas porque a cafeteria usa a MESMA
    // Archivo em caixa NORMAL: mesma fonte, duas casas, e a caixa é o que
    // separa uma coisa feita à mão de uma coisa feita para ser vista de longe.
    displayFont: "'Archivo', system-ui, sans-serif",
    bodyFont: "'Archivo', system-ui, sans-serif",
    displayCase: 'upper',
    // Bem aberto, ao contrário da Pizza House: letra espaçada em caixa alta é
    // sinalização contemporânea; letra apertada é cartaz.
    displayTracking: '0.04em',
    // 30px contra os 20 de antes. Vinte era meio-termo — nem quina de placa nem
    // canto generoso — e meio-termo não é assinatura de nada.
    radius: 30,
    // A ELEVAÇÃO DE VIDRO, e é aqui que a casa deixa de ser vintage.
    //
    // Ela era `hard`: deslocamento sólido, sem desfoque, que é por definição a
    // sombra de uma coisa IMPRESSA — adesivo, placa esmaltada. Era coerente com
    // o creme e com o Anton, e virou o problema no instante em que o painel
    // inteiro passou a ser de vidro: um cartão que se vê ATRAVÉS e que projeta
    // um bloco de tinta pede ao olho que leia "impresso" e "camada" ao mesmo
    // tempo. O olho percebe a contradição antes de saber nomeá-la, e o que ele
    // relata é sujeira.
    //
    // Houve uma tentativa de conciliar os dois — o vidro virava acrílico
    // laminado, quase sólido, com um fio de tinta fechando a borda — e ela
    // funcionava. Só que o resultado era uma casa que usava vidro para PARECER
    // impressa, o que é gastar o material mais contemporâneo que existe para
    // chegar num sinal de 1955. `glass` desfaz o nó pelo outro lado: a
    // profundidade vem do desfoque e da quina de luz, e a sombra é larga, baixa
    // e sem cor — ela não desenha um bloco, desenha uma distância.
    elevation: 'glass',
    // E o vidro dela é o mais NEUTRO das três, porque é a casa que mais depende
    // de o material parecer material. 20px de espessura fica entre a placa
    // grossa da cafeteria e a lâmina da pizzaria; a tonalidade é o amarelo da
    // marca, que sobre um neutro frio dá um vidro levemente dourado em vez de
    // um vidro amarelo.
    glassTint: '#FACC15',
    glassBlur: 20,
    glassOpacity: 0.66,
    logoUrl: '/demo/maxburger/logo.png',
  },
  media: { posterUrl: '/demo/maxburger/attract.jpg' },
  copy: {
    attractCta: 'Toque e monte o seu',
    modeTitle: 'Aqui ou pra viagem?',
    modeHere: 'Aqui mesmo',
    modeAway: 'Pra viagem',
    identifyTitle: 'Bota o telefone,\ne a gente te conhece',
    identifySubtitle: 'Crédito, o combo do clube e o recibo no WhatsApp. Só se você quiser.',
    menuTitle: 'Monta o seu',
    paymentTitle: 'Fecha como?',
    emptyCta: 'Escolha um lanche',
  },
  persona: {
    name: 'Duda',
    voice: [
      'Você é a Duda, do balcão do MaxBurger. Fale rápido e animada, como quem',
      'está de frente para a chapa: "esse sai em cinco minutos", "esse é o que',
      'mais vende no almoço". Nada de cerimônia — aqui ninguém quer conversa,',
      'quer o lanche. Se pedirem recomendação, dê UMA e diga por quê em meia frase.',
    ].join(' '),
    voiceId: 'verse',
    accent: [
      'Português do Brasil, sotaque paulistano jovem, voz feminina, ritmo rápido e alto.',
      'Pode usar "manda", "fechou", "bora" — sem exagerar na gíria.',
      'Preços em reais lidos por extenso: "trinta e seis reais", não "R$ 36,00".',
    ].join(' '),
    playbook: [
      'LANCHE PRIMEIRO. Descubra qual sanduíche antes de qualquer outra coisa — é a decisão que trouxe o cliente até aqui.',
      'Se o lanche é de carne, pergunte o PONTO com as três opções de uma vez: "ao ponto, ao ponto pra menos ou bem passado?". Frango e veggie não têm ponto: não pergunte.',
      'Aí o pão, com as três opções e a diferença de preço quando houver.',
      'Ofereça o COMBO uma vez, dizendo o que entra e quanto custa a mais: "vira combo com fritas e refri por dezesseis reais?". Se recusarem, siga.',
      'Se o lanche escolhido está em PROMOÇÃO (preço riscado), diga o quanto economiza — uma frase, na hora de confirmar.',
      'Só depois ofereça adicional, nomeando um: "manda um bacon nele?". Uma vez só.',
      'Se ele tem crédito ou oferta do clube, diga na hora de fechar — não no começo, que soa a vendedor.',
      'Fechou? Leve para o pagamento sem mais perguntas.',
    ],
    suggestions: ['Qual o mais pedido?', 'Tem opção sem carne?'],
  },
  catalog: {
    categories: [
      { id: 'mb-c-lanches', name: 'Lanches', sortOrder: 1 },
      { id: 'mb-c-porcoes', name: 'Porções', sortOrder: 2 },
      { id: 'mb-c-bebidas', name: 'Bebidas', sortOrder: 3 },
      { id: 'mb-c-sobremesas', name: 'Sobremesas', sortOrder: 4 },
    ],
    products: [
      {
        id: 'mb-p-classico',
        categoryId: 'mb-c-lanches',
        name: 'Max Clássico',
        burger: { recipe: 'classic', defaultForAssembly: true },
        description: 'Blend de 160g, queijo prato, alface, tomate e o molho da casa.',
        priceCents: 2900,
        imageUrl: '/demo/maxburger/max-classico.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: burgerGroups('mb-p-classico', 'classic'),
      },
      {
        id: 'mb-p-cheddar-bacon',
        categoryId: 'mb-c-lanches',
        name: 'Cheddar Bacon',
        burger: { recipe: 'cheddar-bacon' },
        description: 'Cheddar cremoso, quatro fatias de bacon e cebola crispy.',
        priceCents: 3600,
        compareAtCents: 4200,
        imageUrl: '/demo/maxburger/cheddar-bacon.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: burgerGroups('mb-p-cheddar-bacon', 'cheddar-bacon'),
      },
      {
        id: 'mb-p-smash-duplo',
        categoryId: 'mb-c-lanches',
        name: 'Smash Duplo',
        burger: { recipe: 'smash-double' },
        description: 'Dois discos prensados na chapa, com queijo derretido nos dois.',
        priceCents: 3900,
        imageUrl: '/demo/maxburger/smash-duplo.jpg',
        soldOut: false,
        featured: true,
        modifierGroups: burgerGroups('mb-p-smash-duplo', 'smash-double'),
      },
      {
        id: 'mb-p-frango',
        categoryId: 'mb-c-lanches',
        name: 'Frango Crocante',
        burger: { recipe: 'chicken' },
        description: 'Filé empanado na hora, com maionese de limão.',
        priceCents: 3200,
        imageUrl: '/demo/maxburger/frango-crocante.jpg',
        soldOut: false,
        featured: false,
        // Sem ponto da carne: não existe frango empanado "ao ponto".
        modifierGroups: burgerGroups('mb-p-frango', 'chicken'),
      },
      {
        id: 'mb-p-veggie',
        categoryId: 'mb-c-lanches',
        name: 'Veggie do Chef',
        burger: { recipe: 'veggie' },
        description: 'Hambúrguer de grão-de-bico e beterraba, com queijo vegetal.',
        priceCents: 3100,
        imageUrl: '/demo/maxburger/veggie.jpg',
        // O esgotado da casa. Um cardápio de demonstração só com caminho feliz
        // não demonstra design nenhum.
        soldOut: true,
        featured: false,
        modifierGroups: burgerGroups('mb-p-veggie', 'veggie'),
      },
      {
        id: 'mb-p-fritas',
        categoryId: 'mb-c-porcoes',
        name: 'Fritas rústicas',
        description: 'Com casca e alecrim. Serve dois.',
        priceCents: 1800,
        imageUrl: '/demo/maxburger/fritas.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'mb-p-onion',
        categoryId: 'mb-c-porcoes',
        name: 'Onion rings',
        description: 'Doze anéis, empanados na cerveja.',
        priceCents: 2100,
        imageUrl: '/demo/maxburger/onion-rings.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'mb-p-shake',
        categoryId: 'mb-c-bebidas',
        name: 'Milkshake de baunilha 400ml',
        description: 'Sorvete de verdade, batido na hora.',
        priceCents: 2200,
        imageUrl: '/demo/maxburger/milkshake.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'mb-p-refri',
        categoryId: 'mb-c-bebidas',
        name: 'Refrigerante 500ml',
        description: 'Gelado de verdade.',
        priceCents: 900,
        imageUrl: '/demo/maxburger/refrigerante.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
      {
        id: 'mb-p-brownie',
        categoryId: 'mb-c-sobremesas',
        name: 'Brownie com sorvete',
        description: 'Quente por dentro, com uma bola de creme.',
        priceCents: 1900,
        imageUrl: '/demo/maxburger/brownie.jpg',
        soldOut: false,
        featured: false,
        modifierGroups: [],
      },
    ],
  },
}

export const DEMO_TENANTS: Record<DemoTenantId, DemoTenant> = {
  'cafe-sabor': CAFE_SABOR,
  'pizza-house': PIZZA_HOUSE,
  maxburger: MAXBURGER,
}

export const DEMO_TENANT_IDS = Object.keys(DEMO_TENANTS) as DemoTenantId[]

// Qual dos três está no ar, e se o painel está em modo demonstração, é decidido
// em `src/demo/mode.ts`. Este arquivo é só o DOCUMENTO de cada casa: mantê-lo
// livre de `window` e de `import.meta.env` é o que permite um teste de unidade
// carregá-lo sem navegador nenhum.
