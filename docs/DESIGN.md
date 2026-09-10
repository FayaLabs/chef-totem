# Design do totem

Regras deste painel. Cada uma existe porque a alternativa já falhou em teste ou
falharia no salão — se você for mudar alguma, mude sabendo o que ela pagava.

## O aparelho

Painel de 27" em pé, 1080×1920, ~82 DPI. **1 px CSS ≈ 0,31 mm.**

Esse número decide quase tudo abaixo.

## Alvos de toque

| | Tamanho | Onde |
|---|---|---|
| Mínimo | **88 px** (≈27 mm) | qualquer coisa tocável |
| Repetido | **104 px** | stepper, teclado numérico |
| Compromisso | **120 px** | barra inferior |

O 44 px que todo guia de mobile repete daria **13 mm** aqui — abaixo do padrão
de quiosque, que é 19 mm. Alvo pequeno num painel vertical não gera "erro de
toque": gera cliente virando para o balcão e perguntando se está quebrado.

Folga mínima entre alvos: **16 px**.

## Sem hover

Não existe `:hover` em lugar nenhum deste app, e há um teste que falha se
aparecer (`e2e/no-hover.spec.ts`). Num painel de toque o `:hover` gruda no
último elemento tocado e fica aceso, o que lê como seleção travada que nada
desfaz.

O que existe é `press`: escala 0,97 em 120 ms.

## Cor

| Papel | Hex | |
|---|---|---|
| Tinta | `#0B0B0C` | texto e superfícies escuras |
| Cartão | `#FFFFFF` | |
| Página | `#F4F4F5` | |
| Ação | `#DC2626` | 4,83:1 com texto branco |
| Ouro | `#A16207` | destaque secundário |
| Borda de controle | `#71717A` | 4,0:1 contra a página |
| Divisória | `#E4E4E7` | **nunca** como única borda de algo tocável |

**Um vermelho por tela.** O vermelho é o compromisso — adicionar, finalizar,
pagar. Dois vermelhos na mesma tela e nenhum dos dois é o próximo passo.

### Borda de controle vazado
Um botão branco sobre página quase branca tem **1,06:1** de diferença de
preenchimento: a borda carrega a affordance inteira sozinha, então ela cai sob
a WCAG 1.4.11 e precisa de 3:1. O `#E4E4E7` original dava 1,15:1 — sumia no
painel, e sob o brilho do salão nem existia.

### Desabilitado é neutro, não é a cor de ação lavada
`opacity` sobre vermelho dá um botão rosa que continua lendo como "o botão
vermelho, com a tela meio apagada" — e o cliente continua tocando. Desabilitado
é cinza (`#E4E4E7` com texto `#52525B`, 5,6:1) e **diz o motivo por escrito**.

## Tipografia

- **Anton** no display: título, marca, preço grande.
- **Archivo** na UI e nos números, com `tabular-nums` para o preço não dançar de
  largura quando a quantidade vai de 9 para 10.

Ambas **self-hosted** em `public/fonts` (104 KB), não do
`fonts.googleapis.com`. O painel precisa continuar vendendo com a internet
caída, e um quiosque que cai para Impact no meio do turno parece quebrado de um
jeito que ninguém no salão consegue diagnosticar.

`font-display: block`, não `swap`: um título de 100 px que reflui de Impact para
Anton um instante depois da pintura é um solavanco visível numa tela que
ninguém está rolando. Vindo de arquivo local, os 3 s de texto invisível nunca
acontecem.

## Escala

Tudo em **`cqw`** contra o palco 9:16 (`TotemViewport`), não em `vw` contra a
janela. `vw` mede o navegador, então a mesma build teria proporções diferentes
num laptop 16:10 e no painel — e o screenshot do Playwright deixaria de provar
qualquer coisa. A 1080 de largura, `1cqw = 10,8 px`.

**Exceção: tamanho de toque é em pixel.** Um alvo é uma coisa física — 27 mm de
vidro — e não pode encolher porque alguém montou um painel menor.

| Token | Valor | |
|---|---|---|
| `--step-hero` | 9cqw | ~97 px |
| `--step-display` | 5,4cqw | ~58 px |
| `--step-title` | 3,2cqw | ~35 px |
| `--step-body` | 1,9cqw | ~21 px |
| `--step-label` | 1,3cqw | ~14 px |

## Zona de alcance

**O caminho primário mora abaixo de 40% da altura.** O topo é vitrine: foto,
título, marca.

Primário é o que faz o pedido andar — escolher o modo, digitar, confirmar,
finalizar. Controle **secundário** (seletor de tipo, filtro de categoria) pode
ficar mais alto; é para isso que o modo acessível existe.

A regra estava escrita como "nada interativo acima de 40%" e eu mesmo a quebrei
na primeira tela com teclado. `e2e/reach-zone.spec.ts` mede, por tela, quais
`testid` são primários — mudar isso agora custa um teste vermelho, não uma
lembrança.

### Modo acessível
O botão de acessibilidade (canto inferior esquerdo, dentro da `BottomBar`)
entrega os 38% de cima e reflui a interface para a parte de baixo.

**Ele não encolhe a UI.** Escalar reduziria os alvos de toque, o que torna o
painel mais difícil justamente para quem pediu ajuda para alcançá-lo.

## Chrome persistente

A `BottomBar` existe porque o toggle de acessibilidade era flutuante e, num
painel cujo miolo rola, um controle flutuante **sempre** acaba por cima de
alguma coisa. Botão escondido embaixo de outro botão é o pior tipo de defeito:
nada nele parece errado. Slot reservado em chrome de verdade elimina a classe
inteira do problema.

Toda área que rola reserva `var(--tap-bar)` de padding embaixo.

## Sheet, não página

Produto, carrinho e pagamento sobem como sheet sobre a tela anterior. O cliente
está no meio de uma decisão; navegar para outra página faz "voltar e comparar"
custar dois toques e uma posição de rolagem.

Scrim em **60%**. Scrim claro sobre foto de comida lê como decoração e o
cliente continua tocando no prato de trás.

## Movimento

- Entrada 260 ms, `cubic-bezier(0.16, 1, 0.3, 1)`; saída é desmonte.
- `prefers-reduced-motion` zera tudo, inclusive o vídeo de fundo.
- Um elemento em movimento por tela. Vídeo de fundo não conta como movimento de
  interface.

## Vidro

O painel é feito de vidro: chip, tecla, cartão de prato, trilha de categorias,
cabeçalho do cardápio, faixa do garçom e os dois cartões de "comer aqui /
levar". O que o vidro paga é a foto continuar existindo debaixo da interface —
num painel cuja proposta inteira é a imagem da comida, cada retângulo branco
opaco é um pedaço do argumento de venda tapado com papel.

O que ele custa está escrito abaixo, e é mais do que parece.

### Não é uma camada de cor da marca

A primeira versão dissolveu 10% da cor da casa na pane, e os dois cartões da
tela de modo da pizzaria não ficaram de vidro: ficaram **marrons**. Quem olhou
disse a frase exata — "mudou a cor dos cards" — e estava certo.

Vidro é o fundo aparecendo, desfocado, com uma quina de luz e no máximo um sopro
de cor. Hoje a tonalidade entra a **3,5%** na pane clara e **6%** na escura. O
teste é comparativo, nunca absoluto: as três casas lado a lado têm de ser
distinguíveis, e cada uma sozinha não pode ter "cor de cartão".

### O piso de contraste anda com o TEXTO, não com a pane

Vidro translúcido sobre foto de comida é a maneira mais fácil de reprovar em
contraste sem nenhuma cor ter mudado. A saída errada é opacificar tudo: uma pane
grande com o piso no corpo inteiro tapa com plástico fosco exatamente a comida
que trouxe o cliente até ali, e o piso não fazia falta em lugar nenhum a não ser
embaixo do rótulo — que ocupa um sexto da peça.

Então são duas densidades, e **quem decide qual usar é o tamanho**:

| | Onde | Alpha |
|---|---|---|
| `--glass-veil` | a pane grande, para a foto atravessar | livre |
| `--glass-plate` | o fundo do texto, e só dele | **calculado** |

Quanto maior a pane, mais transparente ela pode e deve ser — e mais o texto
precisa do próprio fundo. Uma pastilha pequena que é quase só texto usa a
densidade inteira e não esconde nada, porque não há nada debaixo dela.

O alpha do `plate` não é escolhido: `glassOf()` varre até achar o menor valor
que ainda segura o texto contra o **pior fundo possível** — branco, para texto
branco sobre foto (um prato estourado de luz); preto, para tinta escura sobre
conteúdo vivo. Um tenant que peça mais transparência do que isso tem o número
levantado e uma reclamação no console.

### Medir em pixel, não em `getComputedStyle`

`e2e/design-system.spec.ts` lê estilo computado, e sobre vidro isso devolve a
cor da **pane** — não a cor que o olho vê depois de a foto atravessar por trás
dela. É a diferença entre um teste que passa e uma tela legível.

`.evidence/glass-contrast.mjs` faz a medição de verdade: apaga a tinta do texto,
fotografa o que passa por trás dele e devolve o pior pixel da caixa, nas três
casas. Foi ele que reprovou o scrim da tela de modo em 34% (3,84:1 na cafeteria,
que tem o pôster mais claro) e aprovou em 44% (5,44:1). **Mexer no scrim ou na
cobertura do vidro sem rodar aquele script é mexer no contraste no escuro.**

E foi ele que achou a armadilha das **duas camadas**: a tarja de ESGOTADO é
composta sobre a foto e só depois o cartão inteiro vai a 60% de opacidade contra
a página. O segundo estágio lava o branco do texto junto com o preto do fundo, e
`bg-ink/85` — que passa sozinho com folga — caía para 2,88:1 sobre o pão claro
de um lanche esgotado. Um piso calculado mede a pane isolada; a tela não pinta a
pane isolada. Onde houver `opacity` num ancestral, medir em pixel é a única
medição que vale.

### Vidro só desfoca onde há o que desfocar

`backdrop-filter` sobre uma cor chapada devolve exatamente a mesma cor e cobra
uma camada de composição. Chip, tecla e cartão de prato moram sobre a página,
que é uma cor lisa: ali o "vidro" é a mistura **já resolvida**, opaca, sem filtro
nenhum — o olho não distingue e o compositor deixa de carregar vinte camadas
numa grade que rola.

Sobram quatro camadas de desfoque simultâneas no pior caso: o scrim do sheet, o
cabeçalho do cardápio, a faixa do garçom e a pane sobre foto da tela em que se
está. Antes de aplicar
`backdrop-filter` em mais alguma coisa, a pergunta é se há mesmo conteúdo por
trás — quase sempre não há.

### Refração de borda

O que separa "vidro líquido" de "vidro fosco" acontece nos três milímetros da
quina: o que está atrás entorta e escorrega para fora. É um `feDisplacementMap`
sobre um mapa em gradiente (`src/design/Glass.tsx`) cujo miolo é **constante** —
a distorção existe só onde não há informação, e o centro sai do filtro idêntico
ao que entrou. Um mapa que varia de ponta a ponta entortaria também a área do
texto, que é a versão bonita de texto ilegível.

É opt-in (`.glass-warp`), num punhado de panes grandes e paradas. Um filtro SVG
por cartão numa grade que rola é o caminho mais curto para um quiosque que treme.

### Cromo flutua, compromisso é opaco

A regra que decide, em qualquer peça, se ela leva vidro:

> O que **emoldura** o cardápio — o cabeçalho, a faixa do garçom — é vidro,
> porque saber que o cardápio continua ali embaixo é informação útil. O que
> **tira** o cliente do cardápio — carrinho, finalizar, o meio de pagamento
> escolhido — é sólido, porque ali a única coisa que importa é o próprio botão.

A barra de baixo foi de vidro por um dia, e é o pior caso que existe: o que
passa por baixo dela é uma foto de comida que **rola**, então o contraste de
"Carrinho" mudava a cada quadro. Piso de alpha garante o mínimo, não garante
ESTABILIDADE — e em troca o efeito oferecia ver o cardápio através da barra que
serve exatamente para sair dele.

O cabeçalho é o caso oposto e por isso é vidro **escuro** e denso: o texto dele é
branco, as três páginas são claras, e o que passa por baixo é foto de comida.
`--glass-chrome` fica acima do piso de propósito — ali o vidro não existe para
mostrar o que está atrás, existe para **insinuar** que está.

Quando duas faixas claras se encostam (a do garçom e a de baixo), o limite entre
elas é uma borda de `edge`: sem um limite medido elas se fundem numa faixa só de
240px, que é a mesma armadilha da borda de controle vazado.

### Vidro e sombra sólida não convivem

`hard` é, por definição, a sombra de uma coisa **impressa**: deslocamento
sólido, sem desfoque, adesivo colado na parede. O vidro é o contrário — uma
coisa com espessura, que deixa passar luz. Uma casa com os dois pede ao olho que
leia "impresso" e "camada" no mesmo cartão, e o olho percebe a contradição antes
de saber nomeá-la: o que ele relata é sujeira, não material.

Houve uma tentativa de conciliar, e ela funcionava: na casa `hard` o vidro virava
**acrílico laminado** — 5px de desfoque, 93% de cobertura, um fio de tinta
fechando a borda de onde a sombra nasce. O resultado era coerente e era a coisa
errada: uma casa gastando o material mais contemporâneo que existe para chegar
num sinal de 1955.

Daí `elevation: 'glass'`, que desfaz o nó pelo outro lado. A profundidade vem do
desfoque e da quina de luz; a sombra é **larga, baixa e sem cor** — não desenha
um bloco, desenha uma distância. É a elevação que o MaxBurger usa desde que
deixou de ser vintage.

`hard` continua no enum, documentado e sem casa nenhuma. É uma dívida assumida:
`test/demo-tenants.test.ts` deixou de exigir a string e passou a exigir a ideia
— alguma casa tem de sair do padrão, senão o token existe sem nunca ter sido
pintado.

### O que NÃO é de vidro

- **O botão de commit, e a barra inteira que o hospeda.** Ver "Cromo flutua,
  compromisso é opaco" acima. Ela ganha só o realce especular, para pertencer ao
  mesmo material sem deixar ver nada atrás.
- **O corpo do sheet.** É a maior superfície do painel e a que mais pediria o
  efeito, e é também onde mora o texto denso — descrição, sete chips, as linhas
  do carrinho. Vidro se paga em superfície grande e se cobra em texto pequeno.
- **O puxador do sheet.** Ganhou uma pastilha de vidro e virou um retângulo
  cinza boiando sobre a foto da pizza: lê como defeito de renderização e come a
  foto. Num traço de 11cqw por 0,85cqw não há área para revelar nada — só sobra
  o material, que sem função é sujeira em cima do prato.
- **O recibo.** É papel.

## Tema por tenant

Toda cor, fonte e raio é uma variável CSS. Um restaurante novo é um objeto de
configuração (`totemConfig.theme`), não um fork.

```ts
theme: { action: '#0F766E', ink: '#111827', accent: '#F59E0B', radius: 20 }
```

O tema não é só paleta. Duas marcas podiam escolher dois vermelhos parecidos e o
painel ficaria idêntico — e "trocar de restaurante é trocar um objeto" só vale
se a troca for visível do outro lado do corredor de uma feira. Então também são
token:

| Token | O que muda | Por que é marca, e não ergonomia |
|---|---|---|
| `onAction` | a tinta SOBRE a cor de ação | Era branco fixo, e branco fixo proíbe toda marca clara: amarelo com texto branco dá 1,7:1, ou seja, um botão de PAGAR ilegível. `checkTheme` mede este par. |
| `actionInk` | a marca quando ela é TEXTO | Preço, "obrigatório", total do carrinho. O amarelo que funciona como preenchimento dá 1,6:1 como texto sobre cartão — no elemento que mais decide a compra. Ausente, a própria `action` serve. |
| `displayCase` | título em caixa alta ou não | Uma cafeteria que quer parecer feita à mão não escreve BOLO DE FUBÁ na parede. Só o DISPLAY varia: rótulo de botão e de chip continua em caixa alta fixa, porque ali a caixa alta é legibilidade a um metro. |
| `displayTracking` | espacejamento do título | Anton apertado é cartaz; Anton espaçado é letreiro de fachada. Mesma fonte, duas casas diferentes. |
| `elevation` | `soft` / `hard` / `flat` / `glass` | Como o cartão se descola da página. `hard` é deslocamento sólido sem desfoque — placa esmaltada, adesivo; `glass` é sombra larga e baixa, que desenha distância em vez de bloco. É o que distingue uma casa da outra antes de a pessoa ler uma palavra, e `hard` e `glass` não cabem na mesma casa (ver Vidro). |
| `glassTint` | a cor que o vidro empresta ao que está atrás | Vidro incolor é a razão de metade dos painéis "de vidro" parecerem o mesmo painel. Sai do `accent` e não do `action`: o vermelho de commit já é a coisa mais forte da tela e não pode estar também no material. |
| `glassBlur` | espessura, em px de desfoque no painel de 1080 | 26 é uma placa grossa que só deixa passar cor; 5 é uma lâmina onde ainda se lê o que está atrás. A refração de borda é DERIVADA daqui — as duas descrevem a mesma propriedade física. |
| `glassOpacity` | quanto da tonalidade cobre a pane | Também o piso de legibilidade, e por isso não é um número livre: `glassOf` levanta o valor até o mínimo que segura o texto sobre o pior fundo possível e reclama no console quando precisa. |

**Não existe token de textura, e a ausência foi testada.** Houve um
`background-image` por tenant — grão diagonal numa casa, listras de toldo na
outra. Passava em contraste (o padrão ficava abaixo de 1,1:1 contra a página) e
mesmo assim estava errado: contraste mede legibilidade, não mede RUÍDO. Numa
grade de dez cartões brancos, a listra é a única coisa que se move quando o olho
se move, e ela aparece exatamente nas frestas, onde não há informação nenhuma.

As três casas de demonstração e o painel de serviço que troca entre elas estão
em `docs/DEMO-TENANTS.md`.

**O que NÃO é tematizável, de propósito:**

- **Tamanho de toque** (88 / 104 / 120px). Isso é ergonomia, não marca. Um
  tenant que quer "botões mais justos" quer um painel onde as pessoas erram.
- **O piso de contraste.** `checkTheme()` roda antes da primeira pintura e
  reprova o que falha em AA. Um restaurante escolhendo a cor da marca não está
  pensando no salão às 14h contra a janela — "nosso vermelho é um pouco mais
  claro" é como o botão de Pagar fica ilegível.

Reprovar avisa no console em vez de lançar: uma marca levemente fora do padrão
deve subir com reclamação, não deixar a loja sem vender.

## Sheet: arrastar para baixo fecha

Todo mundo chega ao totem carregando a memória muscular do celular, e no
celular um sheet se arrasta para fora. Obedecer ao gesto que a pessoa já tenta
vale mais aqui do que no telefone: um cliente que sente que "o totem não
funciona" desiste na frente da fila em vez de procurar o botão de fechar.

- Só arrasta se o corpo já está no topo — senão, rolar uma lista longa de
  modificadores jogaria o sheet fora no meio da leitura.
- 140px é o limite. Abaixo disso volta, para que um esbarrão não custe o lugar.

## Velocidade

O cardápio é buscado no **attract**, não quando a tela de menu monta. Carregar
ali media **3,2s** — login do aparelho mais seis queries — com o cliente
olhando um esqueleto depois de já ter feito tudo o que foi pedido dele.

Como o cliente leva três toques para chegar, o prefetch cabe inteiro nesse
intervalo:

| | espera pelo cardápio |
|---|---|
| sem prefetch | 3.174 ms |
| robô (3 toques instantâneos) | 786 ms |
| **ritmo humano (1,5s por toque)** | **2 ms** |

O carrinho é local e instantâneo — não há request para ser otimista. A única
escrita de rede é o pedido, e essa **não** deve ser otimista: é dinheiro, e o
cliente precisa saber se falhou.
