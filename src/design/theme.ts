// ---------------------------------------------------------------------------
// One panel, many restaurants.
//
// Every colour, radius and font the totem paints with is a CSS variable, and
// this is where a tenant overrides them. Nothing in the components hardcodes a
// hex — a new brand is a config object, not a fork.
//
// What is NOT themeable, deliberately:
//   - touch sizes (88 / 104 / 120px). Those are ergonomics, not brand. A
//     tenant who wants "tighter buttons" wants a panel people mis-tap.
//   - the contrast floor. A brand colour that fails AA against its own text is
//     rejected at boot (see applyTheme) rather than shipped to a dining room.
// ---------------------------------------------------------------------------

/**
 * Como o painel se ELEVA. Marca, não ergonomia.
 *
 * `soft` é a sombra difusa de sempre — a casa que quer parecer cuidada.
 * `hard` é o deslocamento sólido de placa esmaltada, sem desfoque: lanchonete,
 * cartaz, adesivo. `flat` não tem sombra nenhuma, e a hierarquia fica por
 * conta da cor — é o que uma marca minimalista pede.
 *
 * `glass` nasceu de uma contradição que não tinha conserto. O `hard` é, por
 * definição, a sombra de uma coisa IMPRESSA: deslocamento sólido, sem
 * desfoque, adesivo colado na parede. O vidro é o contrário disso — uma coisa
 * que tem espessura e deixa passar luz. Uma casa que usasse os dois pedia ao
 * olho que lesse "impresso" e "camada" no mesmo cartão, e o olho percebe a
 * contradição antes de saber nomeá-la: lê como sujeira, não como material.
 *
 * Então `glass` é a elevação que o vidro pede: sombra LARGA, muito baixa e sem
 * cor própria — a peça não projeta um bloco, ela afasta a página. A hierarquia
 * vem da quina de luz e do desfoque, e não de um deslocamento que finge tinta.
 *
 * Nenhuma delas mexe em tamanho de alvo nem em contraste: a sombra é a última
 * coisa que a pessoa lê e a primeira que diferencia duas marcas de longe.
 */
export type TotemElevation = 'soft' | 'hard' | 'flat' | 'glass'

export interface TotemTheme {
  /** The commit colour: add, checkout, pay. One per screen. */
  action: string
  /**
   * A cor do TEXTO sobre a cor de ação.
   *
   * Era branco fixo no código, e branco fixo proíbe metade das marcas de
   * lanchonete que existem: um amarelo de fast-food com texto branco dá 1,7:1
   * — o botão de PAGAR ilegível. Sendo um token, o amarelo entra com tinta
   * escura e passa em AA; e `checkTheme` mede ESTE par, não o par imaginário
   * com o branco.
   */
  onAction: string
  /**
   * A cor da marca quando ela precisa ser TEXTO, e não preenchimento.
   *
   * Preço, "obrigatório", o total do carrinho: tudo isso era `text-action`, o
   * que só funciona enquanto a cor de ação é escura. Um amarelo de lanchonete
   * como texto sobre cartão branco dá 1,6:1 — o preço do lanche, ilegível, no
   * elemento que mais decide a compra.
   *
   * Ausente, a própria cor de ação serve (é o caso das marcas escuras, que são
   * a maioria). A checagem de contraste vale para as duas.
   */
  actionInk?: string
  /** Text and dark surfaces. */
  ink: string
  /** Cards. */
  surface: string
  /** The page behind the cards. */
  page: string
  /** Secondary accent (badges, promo). */
  accent: string
  /** Boundary of an outlined control — must clear 3:1 against `page`. */
  edge: string
  /** Display face, for the headline and the brand. */
  displayFont: string
  /** UI face. Needs tabular figures. */
  bodyFont: string
  /**
   * O título grita ou fala?
   *
   * `upper` é o cartaz; `none` respeita a caixa em que a cópia foi escrita.
   * Uma cafeteria que quer parecer feita à mão não escreve BOLO DE FUBÁ na
   * parede, e uma lanchonete não sussurra o nome do lanche.
   */
  displayCase: 'upper' | 'none'
  /** Entrelinha horizontal do display. Negativa aperta, positiva espaça. */
  displayTracking: string
  /** Card corner radius, in px. */
  radius: number
  /** Como cartões e o botão de commit se descolam da página. */
  elevation: TotemElevation
  /**
   * NÃO EXISTE UM TOKEN DE TEXTURA, e a ausência foi testada.
   *
   * Houve um: `background-image` por tenant, com um grão diagonal na cafeteria
   * e listras de toldo na lanchonete. Passou em contraste (o padrão ficava
   * abaixo de 1,1:1 contra a página) e mesmo assim estava errado, porque
   * contraste mede legibilidade e não mede RUÍDO. Numa grade de dez cartões
   * brancos, a listra é a única coisa da tela que se move quando o olho se
   * move, e ela aparece exatamente nas frestas entre os cartões — o lugar onde
   * não há informação nenhuma.
   *
   * A marca continua variando por cor de página, raio e elevação, que é o que
   * o cliente lê como "outro restaurante" sem ler nada.
   */
  /**
   * A COR QUE O VIDRO EMPRESTA ao que está atrás dele.
   *
   * Vidro incolor é a razão de metade dos painéis "de vidro" parecerem o mesmo
   * painel: desfoque branco sobre fundo claro é neutro por definição, e um
   * neutro não tem marca. A tonalidade é o que faz a mesma pane parecer
   * caramelo numa cafeteria e brasa numa pizzaria — e ela sai do `accent`, que
   * é a cor secundária da casa, e não do `action`, porque o vermelho de commit
   * já é a coisa mais forte da tela e não pode estar também no material.
   */
  glassTint: string
  /**
   * Quanto o vidro é ESPESSO, em px de desfoque no painel de 1080.
   *
   * É o token que mais separa as casas: 26 é uma placa grossa e leitosa que só
   * deixa passar cor; 5 é uma lâmina de acrílico onde ainda se lê o que está
   * atrás. `applyTheme` o converte para `cqw` — uma sombra ou um desfoque em px
   * some quando o painel encolhe, e a mesma build serve o vidro de 27" e a
   * janela do Playwright. A refração de borda é DERIVADA daqui: as duas
   * descrevem a mesma coisa, que é a espessura.
   */
  glassBlur: number
  /**
   * Quanto da tonalidade cobre a pane, de 0 a 1.
   *
   * É também o piso de legibilidade, e por isso não é um número livre: um vidro
   * translúcido demais sobre uma foto de comida é a maneira mais fácil de
   * reprovar em contraste sem nenhuma cor ter mudado. `applyTheme` levanta o
   * valor até o mínimo que segura o texto sobre o PIOR fundo possível e
   * reclama no console quando precisa fazer isso — ver `glassOf`.
   */
  glassOpacity: number
  /** Optional wordmark. Absent = the brand name is set in the display face. */
  logoUrl?: string
}

export const defaultTheme: TotemTheme = {
  action: '#DC2626',
  onAction: '#FFFFFF',
  ink: '#0B0B0C',
  surface: '#FFFFFF',
  page: '#F4F4F5',
  accent: '#A16207',
  edge: '#71717A',
  displayFont: "'Anton', Impact, sans-serif",
  bodyFont: "'Archivo', system-ui, sans-serif",
  displayCase: 'upper',
  displayTracking: '-0.02em',
  radius: 28,
  elevation: 'soft',
  glassTint: '#A16207',
  glassBlur: 18,
  glassOpacity: 0.68,
}

/**
 * A receita de sombra de cada elevação.
 *
 * Em `cqw` como todo o resto do sistema: uma sombra em px encolhe junto com o
 * painel e some, e a mesma build tem de servir o vidro de 27" e a janela do
 * Playwright. Ver DESIGN.md · Escala.
 */
function shadows(theme: TotemTheme): { card: string; action: string } {
  switch (theme.elevation) {
    case 'hard':
      // Sem desfoque: o deslocamento sólido é o que faz um cartão parecer uma
      // placa impressa em vez de um cartão flutuando. A sombra é a TINTA, não
      // o preto genérico — preto puro sob uma página creme lê como sujeira.
      return {
        card: `0.4cqw 0.4cqw 0 ${theme.ink}`,
        action: `0.4cqw 0.4cqw 0 ${theme.ink}`,
      }
    case 'glass':
      // Larga e quase invisível: 2,4cqw de raio a 10% não desenha uma sombra,
      // desenha uma DISTÂNCIA. É o que faz uma pane parecer flutuar um
      // milímetro acima da página em vez de estar colada nela — e é o único
      // tipo de sombra que não briga com a transparência da própria peça.
      return {
        card: `0 0.9cqw 2.4cqw ${rgba(theme.ink, 0.1)}, 0 0.15cqw 0.4cqw ${rgba(theme.ink, 0.06)}`,
        action: `0 0.6cqw 2cqw color-mix(in srgb, ${theme.action} 40%, transparent)`,
      }
    case 'flat':
      return { card: 'none', action: 'none' }
    default:
      return {
        card: '0 0.35cqw 1.2cqw rgba(11, 11, 12, 0.10)',
        // O halo do commit é a PRÓPRIA cor de ação diluída. Fixo em vermelho,
        // ele desenhava uma auréola vermelha em volta de um botão verde.
        action: `0 0.3cqw 1cqw color-mix(in srgb, ${theme.action} 32%, transparent)`,
      }
  }
}

/** `#RGB` ou `#RRGGBB` → os três canais em 0-255. */
function channels(colour: string): [number, number, number] {
  const clean = colour.replace('#', '')
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex(rgb: number[]): string {
  return `#${rgb
    .map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0'))
    .join('')}`
}

/** `amount` de `a` dissolvido em `b`. */
function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  return toHex([
    ar * amount + br * (1 - amount),
    ag * amount + bg * (1 - amount),
    ab * amount + bb * (1 - amount),
  ])
}

/**
 * A cor que o olho realmente vê quando `fill` a `alpha` está sobre `behind`.
 *
 * Composição em sRGB e não em luz linear, de propósito: é assim que o
 * navegador compõe uma camada translúcida, e uma conta "mais correta"
 * aqui prometeria um contraste que a tela não entrega.
 */
function over(fill: string, alpha: number, behind: string): string {
  return mix(fill, behind, alpha)
}

function rgba(colour: string, alpha: number): string {
  const [r, g, b] = channels(colour)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * A tinta que vai sobre a cor de ação — e nunca o branco por omissão.
 *
 * O token tem branco como valor padrão do Tailwind, e esse padrão é uma
 * armadilha exatamente na casa que mais precisa dele: numa marca AMARELA, o
 * branco herdado deixa "toque e monte o seu" em 1,7:1, que é a única chamada
 * da tela de repouso. Um tema que não diz nada (uma marca vinda do banco, um
 * tenant novo) não pode cair no pior caso possível — então a cor da marca
 * decide: fundo claro pede tinta escura, fundo escuro pede branca.
 *
 * O tema continua mandando quando ele TEM opinião: isto só entra quando o
 * valor está vazio, ou quando o que ele pede não se lê contra o próprio fundo.
 */
export function readableOn(action: string, declared?: string): string {
  if (declared && contrast(action, declared) >= 4.5) return declared
  return luminance(action) > 0.4 ? '#18181B' : '#FFFFFF'
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// ---------------------------------------------------------------------------
// O VIDRO
//
// Três materiais, e a diferença entre eles não é estética: é DE ONDE VEM O
// FUNDO. Um vidro é legível ou não conforme o que passa por trás, e num painel
// que roda foto de comida atrás de tudo esse "conforme" é o defeito inteiro.
//
//   `pane`  — sobre a PÁGINA, que é uma cor lisa e conhecida. Aqui o desfoque
//             não tem o que desfocar: `backdrop-filter` sobre uma cor chapada
//             custa uma camada de composição e devolve exatamente a mesma cor.
//             Então esta receita vem JÁ COMPOSTA, opaca, sem filtro nenhum — o
//             olho não distingue, e o compositor deixa de carregar uma dúzia de
//             camadas numa grade que rola.
//   `live`  — sobre conteúdo que se mexe: a faixa do garçom, com o cardápio
//             passando por baixo, e o convite de WhatsApp sobre a tela escura
//             do recibo. Aqui o desfoque se paga, e o pior fundo possível é
//             PRETO. A barra de baixo NÃO está nesta lista, e esteve: ver
//             design/BottomBar.tsx para por que compromisso é opaco.
//   `media` — sobre foto e vídeo, com texto branco. O pior fundo possível é
//             BRANCO: um prato estourado de luz por trás de um vidro claro é
//             exatamente onde a legibilidade morre.
//
// O piso de alpha de cada um é CALCULADO contra o seu pior fundo, não
// escolhido. "Nosso vidro é um pouco mais transparente" é a mesma frase que
// "nosso vermelho é um pouco mais claro" do bloco de contraste — e custa a
// mesma coisa, só que num material onde ninguém pensa em medir.
// ---------------------------------------------------------------------------

/**
 * O menor alpha em que este vidro ainda segura o texto sobre o PIOR fundo.
 *
 * Varredura de um em um centésimo, e não uma inversão algébrica da curva da
 * WCAG: roda uma vez por boot, e a versão legível da conta vale mais aqui do
 * que a versão esperta.
 */
function alphaFloor(fill: string, text: string, worst: string, needs: number): number {
  for (let step = 30; step <= 98; step++) {
    if (contrast(over(fill, step / 100, worst), text) >= needs) return step / 100
  }
  return 0.98
}

export interface GlassRecipe {
  blur: string
  saturation: string
  /** Opaca: a pane já resolvida sobre a página. */
  pane: string
  /** Translúcida, para o vidro que tem conteúdo vivo por trás. */
  live: string
  /** ABERTA: o vidro escuro fino, o que deixa a comida atravessar. */
  veil: string
  /** DENSA: o fundo garantido do texto branco sobre foto. */
  plate: string
  /** CROMO: a faixa escura que emoldura o cardápio. Densa por identidade. */
  chrome: string
  /** A linha de luz do topo — o brilho especular. */
  line: string
  /** O fio de cor da casa na borda de baixo. */
  rim: string
  /** Espessura desse fio. */
  rimWidth: string
  /** Sombra e profundidade da pane OPACA, já obedecendo à elevação da casa. */
  depth: string
  /** O mesmo, para a pane translúcida — que precisa de uma borda fechada. */
  depthLive: string
  /** Escala da refração de borda, em px de deslocamento. */
  warp: number
  /** Os alphas que o piso teve de levantar, para o console reclamar. */
  raised: { token: string; asked: number; floor: number }[]
}

export function glassOf(theme: TotemTheme): GlassRecipe {
  const raised: GlassRecipe['raised'] = []
  const hard = theme.elevation === 'hard'

  // A TONALIDADE ENTRA EM HOMEOPATIA, e a primeira versão errou isto por uma
  // ordem de grandeza. Com 10% da cor da casa dissolvidos na pane, os dois
  // cartões de "comer aqui / levar" da pizzaria não ficaram de vidro: ficaram
  // MARRONS. Quem olhou disse a frase exata — "mudou a cor dos cards" — e
  // estava certo, porque é o que tinha acontecido.
  //
  // Vidro não é uma camada da cor da marca por cima da peça. Vidro é o fundo
  // aparecendo, desfocado, com uma quina de luz e no máximo um SOPRO de cor.
  // O teste é comparativo e não absoluto: as três casas lado a lado têm de ser
  // distinguíveis, e cada uma sozinha não pode ter "cor de cartão". Aos 3,5%
  // ninguém sabe dizer que há tonalidade; com as três lado a lado ninguém
  // confunde qual é qual.
  const paneTint = mix(theme.glassTint, theme.surface, 0.035)
  const mediaTint = mix(theme.glassTint, theme.ink, 0.06)

  // ---------------------------------------------------------------------
  // O CROMO ESCURO SE CONSTRÓI A PARTIR DA TINTA, NÃO DA COR DA MARCA.
  //
  // Ele usava a mesma `mediaTint` das panes sobre foto — 6% do matiz da casa
  // dentro do `ink` — e na hamburgueria o cabeçalho do cardápio virou uma laje
  // MARROM-OLIVA. Não foi exagero de opacidade: é a matemática da mistura.
  // Amarelo dentro de preto dá oliva sempre, e qualquer matiz quente sobre véu
  // escuro vira lama. As outras duas casas escondiam o defeito porque o tijolo
  // e o caramelo já são escuros e quentes; a hamburgueria é a única de matiz
  // CLARO, e foi nela que a regra apareceu.
  //
  // A correção passou por 2% antes de chegar em ZERO, e a última etapa é a que
  // importa: o cromo é `ink` puro. O token certo para uma superfície escura é
  // `ink` — está escrito na definição dele, "texto e superfícies escuras". A
  // cor de AÇÃO é a do compromisso: existe para aparecer em botão, preço e
  // commit, e emprestá-la para tingir chapa é usá-la fora do lugar.
  //
  // Os 2% intermediários não estavam errados, estavam INÚTEIS: imperceptíveis
  // entre as casas e, ainda assim, o bastante para puxar a hamburgueria — cuja
  // marca é neutra fria — de volta para o quente. Um ajuste que ninguém vê mas
  // que estraga um caso é só um caso estragado.
  //
  // A variação entre as casas não some com isso, porque `ink` JÁ É por tenant:
  // `#1C1917` na cafeteria, `#0C0A09` na pizzaria, `#171717` na hamburgueria.
  // A diferença passa a vir do token que existe para carregá-la, em vez de um
  // segundo token misturando por cima do primeiro.
  const chromeTint = theme.ink

  // ---------------------------------------------------------------------
  // O PISO DE LEGIBILIDADE ANDA COM O TEXTO, não com a pane.
  //
  // Foi a segunda coisa que deu errado. Quando a pane inteira carrega o piso,
  // uma peça grande fica leitosa de ponta a ponta: os cartões de modo tapavam
  // com plástico fosco exatamente a comida que trouxe o cliente até ali. E o
  // piso ali não estava fazendo falta em lugar nenhum — só embaixo do rótulo,
  // que ocupa um sexto da peça.
  //
  // Então são duas densidades, e o que decide qual usar é o TAMANHO:
  //
  //   `veil`  — a pane grande, fina de verdade, para a foto atravessar.
  //   `plate` — o fundo do texto, denso, com o piso calculado contra o pior
  //             fundo possível (um prato estourado de luz, ou seja, branco).
  //
  // Quanto maior a pane, mais transparente ela pode e deve ser — e mais o
  // texto precisa do próprio fundo. Uma pastilha pequena que é quase só texto
  // usa `plate` inteira e não esconde nada, porque não há nada debaixo dela.
  // ---------------------------------------------------------------------
  const plateFloor = alphaFloor(mediaTint, '#FFFFFF', '#FFFFFF', 4.5)
  const liveFloor = alphaFloor(paneTint, theme.ink, '#000000', 4.5)

  const keep = (token: string, floor: number) => {
    if (theme.glassOpacity < floor) raised.push({ token, asked: theme.glassOpacity, floor })
    return Math.max(theme.glassOpacity, floor)
  }

  return {
    // Em cqw calibrado, como `--tap`: 26 dá 26px cravados no painel de 1080 e
    // acompanha a escala em qualquer outro. Com piso em px porque um desfoque
    // abaixo de 2px na janela de preview é indistinguível de desfoque nenhum,
    // e aí o vidro simplesmente não aparece para quem está testando no laptop.
    blur: `max(2px, calc(100cqw * ${theme.glassBlur} / 1080))`,
    // Vidro satura o que atravessa; acrílico laminado não. A casa de sombra
    // sólida não pode ter o realce de saturação, senão a foto por trás fica
    // mais viva DENTRO do vidro do que fora, e o painel parece descalibrado.
    saturation: hard ? '108%' : '155%',
    pane: over(paneTint, theme.glassOpacity, theme.page),
    live: rgba(paneTint, keep('glassOpacity · vidro sobre conteúdo vivo', liveFloor)),
    // Sobre foto o vidro é bem menos da metade do que é sobre página: atrás
    // dele está a comida, e a comida é o argumento de venda do painel inteiro.
    // Um piso de 0,14 mesmo assim, porque abaixo disso não sobra material
    // nenhum — a peça deixa de ser uma peça e vira uma borda solta no ar.
    veil: rgba(mediaTint, Math.max(0.14, Math.min(0.42, theme.glassOpacity * 0.36))),
    plate: rgba(mediaTint, plateFloor),
    // O CROMO é mais denso que o piso, e de propósito. O cabeçalho do cardápio
    // é a faixa escura da marca — largar ele no mínimo legível (0,6x) o
    // transformaria num véu cinza, e a casa perderia a única superfície escura
    // que ela tem. Aqui o vidro não existe para mostrar o que passa por trás:
    // existe para INSINUAR que passa. A diferença entre isto e uma cor chapada
    // tem de ser perceptível e não dramática.
    // 0,92 e não 0,86: os 14% de página clara que atravessavam levantavam o
    // valor do preto para um cinza sujo de meio-tom. O que sobra ainda deixa a
    // grade insinuar quando ela rola por baixo — que é a única coisa que o
    // vidro tem a fazer aqui.
    chrome: rgba(chromeTint, Math.max(0.92, plateFloor)),
    // O brilho de cima é o que diz "isto é uma superfície e tem espessura". Na
    // casa de placa esmaltada ele é um fio duro e quase opaco; nas outras é a
    // luz difusa que corre pela quina de uma peça de vidro de verdade.
    line: hard ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.58)',
    // O fio de cor também desceu: a 0,34 ele desenhava um contorno laranja em
    // volta de cada chip, e sete contornos coloridos numa tela são sete coisas
    // competindo com as sete palavras que estão dentro deles.
    rim: rgba(theme.glassTint, hard ? 0.38 : 0.2),
    rimWidth: hard ? '0.24cqw' : '0.16cqw',
    // A PANE OPACA NÃO LEVA FIO DE TINTA, e levou por um dia. Sobre a página o
    // vidro já vem composto — não há transparência nenhuma sobrando — então a
    // sombra sólida já nasce de uma quina de verdade e o fio não resolve nada.
    // O que ele fazia era desenhar uma moldura preta em volta de cada chip, e
    // uma tela com sete molduras compete com as sete palavras que estão dentro
    // delas. É a mesma razão pela qual o Chip perdeu a borda de 2px; reintroduzi-
    // la pelo lado da sombra seria perder a discussão de novo, por outra porta.
    depth: hard
      ? `inset 0 0.2cqw 0 rgba(255, 255, 255, 0.92), 0.4cqw 0.4cqw 0 ${theme.ink}`
      : theme.elevation === 'flat'
        ? 'inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58)'
        : theme.elevation === 'glass'
          ? `inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58), 0 0.8cqw 2.2cqw ${rgba(theme.ink, 0.1)}, 0 0.12cqw 0.35cqw ${rgba(theme.ink, 0.05)}`
          : `inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58), 0 0.25cqw 0.8cqw ${rgba(theme.ink, 0.1)}`,
    // A pane TRANSLÚCIDA é outra história, e aí o fio se paga. Vê-se através do
    // objeto e mesmo assim ele projeta um bloco de tinta sem desfoque: é um erro
    // de impressão, e o olho percebe antes de saber por quê. O fio fecha o
    // objeto, a sombra passa a nascer de uma borda definida, e a peça vira uma
    // lâmina de acrílico em vez de água suja. Ela é sempre grande — a faixa do
    // garçom, o convite de WhatsApp sobre a tela escura do recibo — então o fio
    // corre pela aresta de uma peça só e não vira moldura de nada.
    depthLive: hard
      ? `0 0 0 0.14cqw ${theme.ink}, inset 0 0.2cqw 0 rgba(255, 255, 255, 0.92), 0.4cqw 0.4cqw 0 ${theme.ink}`
      : theme.elevation === 'flat'
        ? 'inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58)'
        : theme.elevation === 'glass'
          ? `inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58), 0 0.8cqw 2.2cqw ${rgba(theme.ink, 0.1)}`
          : `inset 0 0.14cqw 0 rgba(255, 255, 255, 0.58), 0 0.25cqw 0.8cqw ${rgba(theme.ink, 0.1)}`,
    // A refração acompanha a espessura porque é a MESMA propriedade física.
    // Solta como token próprio, ela permitia um vidro fino que entorta a borda
    // como uma lente grossa — que é o efeito de plástico barato, não de vidro.
    warp: Math.round(theme.glassBlur * 0.55),
    raised,
  }
}

export interface ThemeWarning {
  token: string
  ratio: number
  needs: number
  message: string
}

/**
 * A theme is checked before it is painted.
 *
 * A tenant picking their brand colour is not thinking about a dining room's
 * glare, and "our red is a bit lighter" is how a Pagar button becomes
 * unreadable at 2pm by the window. The warnings are returned rather than
 * thrown: a slightly-off brand should ship with a complaint in the console,
 * not leave the store unable to sell.
 */
export function checkTheme(theme: TotemTheme): ThemeWarning[] {
  const warnings: ThemeWarning[] = []
  const rule = (token: string, ratio: number, needs: number, message: string) => {
    if (ratio < needs) warnings.push({ token, ratio, needs, message })
  }

  rule('action', contrast(theme.action, theme.onAction), 4.5,
    'A cor de ação e a tinta que vai sobre ela não passam em AA — o botão de pagar fica ilegível sob luz de salão.')
  rule('actionInk', contrast(theme.actionInk ?? theme.action, theme.surface), 4.5,
    'A cor da marca como TEXTO não passa em AA sobre o cartão — é o preço do prato que fica ilegível. Defina `actionInk` com um tom escuro da mesma família.')
  rule('ink', contrast(theme.ink, theme.page), 4.5,
    'O texto não tem contraste suficiente contra a página.')
  rule('edge', contrast(theme.edge, theme.page), 3,
    'A borda de controle vazado some contra a página (WCAG 1.4.11): num botão branco sobre página quase branca ela carrega a affordance sozinha.')

  // O vidro OPACO sobre a página é a superfície que mais texto carrega no
  // painel — chip, tecla, cartão de prato. Ele não pode ser medido pelo
  // `surface`, porque não É o `surface`: é a mistura da tonalidade da casa com
  // a página, e uma tonalidade escura demais escurece a pane inteira.
  const glass = glassOf(theme)
  rule('glassTint', contrast(theme.ink, glass.pane), 4.5,
    'A tonalidade do vidro escureceu a pane a ponto de o texto sobre ela não passar em AA. Dilua a cor ou baixe `glassOpacity`.')

  // E o piso que `glassOf` teve de levantar sozinho. Não é um erro do painel —
  // ele já subiu o número e vai pintar legível — mas é uma decisão da casa que
  // foi ignorada, e uma decisão ignorada em silêncio volta como bug.
  for (const { token, asked, floor } of glass.raised) {
    warnings.push({
      token,
      ratio: asked,
      needs: floor,
      message: `O vidro pedido é transparente demais para segurar o texto sobre o pior fundo possível; subi para ${floor}. Vidro sobre foto de comida é onde o contraste morre sem ninguém ver.`,
    })
  }

  return warnings
}

export function applyTheme(theme: TotemTheme, root: HTMLElement = document.documentElement): ThemeWarning[] {
  const warnings = checkTheme(theme)
  for (const warning of warnings) {
    console.warn(`[totem/theme] ${warning.token} = ${warning.ratio.toFixed(2)}:1 (mínimo ${warning.needs}:1). ${warning.message}`)
  }

  const shadow = shadows(theme)

  root.style.setProperty('--color-action', theme.action)
  root.style.setProperty('--color-on-action', readableOn(theme.action, theme.onAction))
  root.style.setProperty('--color-action-ink', theme.actionInk ?? theme.action)
  root.style.setProperty('--color-ink', theme.ink)
  root.style.setProperty('--color-surface', theme.surface)
  root.style.setProperty('--color-page', theme.page)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-edge', theme.edge)
  root.style.setProperty('--font-display', theme.displayFont)
  root.style.setProperty('--font-body', theme.bodyFont)
  root.style.setProperty('--display-case', theme.displayCase === 'upper' ? 'uppercase' : 'none')
  root.style.setProperty('--display-tracking', theme.displayTracking)
  root.style.setProperty('--radius-totem', `${theme.radius}px`)
  root.style.setProperty('--shadow-card', shadow.card)
  root.style.setProperty('--shadow-action', shadow.action)

  const glass = glassOf(theme)
  root.style.setProperty('--glass-blur', glass.blur)
  root.style.setProperty('--glass-sat', glass.saturation)
  root.style.setProperty('--glass-pane', glass.pane)
  root.style.setProperty('--glass-live', glass.live)
  root.style.setProperty('--glass-veil', glass.veil)
  root.style.setProperty('--glass-plate', glass.plate)
  root.style.setProperty('--glass-chrome', glass.chrome)
  root.style.setProperty('--glass-line', glass.line)
  root.style.setProperty('--glass-rim', glass.rim)
  root.style.setProperty('--glass-rim-width', glass.rimWidth)
  root.style.setProperty('--glass-depth', glass.depth)
  root.style.setProperty('--glass-depth-live', glass.depthLive)
  // Sem unidade: quem consome é o atributo `scale` de um `feDisplacementMap`,
  // que é um número de usuário de SVG e não um comprimento de CSS.
  root.style.setProperty('--glass-warp', String(glass.warp))
  return warnings
}
