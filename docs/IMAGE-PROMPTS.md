# Fotos das casas de demonstração — prompts

Para gerar no Higgsfield e salvar em `public/demo/<casa>/<slug>.jpg`.

**Todas geradas.** As 13 que faltavam (11 do MaxBurger, 2 matchás do Café
Sabor) saíram do `fal-ai/flux-2-max` com os prompts desta página, em 10/09/2026.

Guardo a semente de cada uma porque regerar UMA foto é o caso comum — a que
saiu com o pão errado, a que ficou clara demais — e sem a semente a foto nova
não pertence mais à mesma grade. A grade é o produto; a foto sozinha não é.

| Arquivo | Semente |
|---|---|
| `maxburger/max-classico.jpg` | 208351281 |
| `maxburger/cheddar-bacon.jpg` | 826416325 |
| `maxburger/smash-duplo.jpg` | 1637681979 |
| `maxburger/frango-crocante.jpg` | 1737302030 |
| `maxburger/veggie.jpg` | 1702752133 |
| `maxburger/fritas.jpg` | 1252898882 |
| `maxburger/onion-rings.jpg` | 1113075216 |
| `maxburger/milkshake.jpg` | 112180080 |
| `maxburger/refrigerante.jpg` | 1753569151 |
| `maxburger/brownie.jpg` | 716496314 |
| `maxburger/attract.jpg` | 1982700809 |
| `cafe-sabor/matcha-latte.jpg` | 1411190777 |
| `cafe-sabor/matcha-gelado.jpg` | 420804799 |

Geradas em 1200×900 (attract em 800×1440) e reduzidas com `sips -Z 900` para a
mesma grade das fotos que já existiam. O attract vai para 506×900.

## As regras que valem para todas

Um cardápio de totem é uma grade de cartões lado a lado. O que decide se ele
parece um produto ou um Google Imagens não é a qualidade de cada foto — é a
**consistência entre elas**. Fundo diferente por prato, ângulo diferente por
prato e temperatura de cor diferente por prato dão onze fotos boas e uma tela
ruim.

| | |
|---|---|
| **Produto** | 900×675 (4:3 deitado). O cartão corta em 18cqw de altura, então o prato tem de estar **centralizado e sobrar margem** — o que encosta na borda some. |
| **Attract** | 506×900 (9:16 em pé). É o fundo da tela inicial, com scrim de 55% e a marca por cima: precisa ter uma **zona escura e calma** no centro vertical. |
| **Formato** | JPG, qualidade alta, abaixo de 250 KB. |
| **Sem texto** | nada de rótulo, embalagem com marca ou placa: a tipografia da tela é a marca, e texto na foto briga com ela. |
| **Sem mãos e sem gente** | numa grade de dez cartões, uma mão aparece dez vezes e vira personagem. |
| **Uma luz só** | a mesma direção e a mesma temperatura em toda a casa. |

Sufixo comum a todos os prompts de produto do MaxBurger — cole no fim de cada
um:

> shot on 50mm, f/4, soft directional window light from the upper left, warm
> neutral white balance, appetising but realistic food styling, no text, no
> logos, no hands, no people, centred subject with generous margin, 4:3
> landscape

## MaxBurger

Direção de arte: **chapa e formica**. Superfície de aço escovado ou formica
creme, luz quente e dura vindo de cima à esquerda, sombras curtas e definidas —
o oposto da luz difusa da cafeteria. A marca é amarelo de toldo com vermelho, e
as fotos têm de deixar espaço para isso sem competir: comida saturada, fundo
neutro e claro.

Ângulo: **três quartos** para os lanches (a altura da pilha é o argumento de
venda) e **de cima** para porções e sobremesa.

| Arquivo | Prompt |
|---|---|
| `max-classico.jpg` | Classic cheeseburger on a brushed steel diner counter, three-quarter angle at burger height, 160g beef patty with melted yellow cheese, crisp lettuce and tomato slice, glossy toasted brioche bun, house sauce just visible at the edge |
| `cheddar-bacon.jpg` | Bacon cheddar burger on a brushed steel diner counter, three-quarter angle at burger height, molten cheddar sauce running down the side, four thick crisp bacon strips, crispy fried onion strands on top, toasted brioche bun |
| `smash-duplo.jpg` | Double smash burger on a brushed steel diner counter, three-quarter angle at burger height, two thin craggy seared patties with lacy crisp edges, melted cheese between both, compact soft bun |
| `frango-crocante.jpg` | Crispy fried chicken burger on a brushed steel diner counter, three-quarter angle, thick craggy golden breaded chicken fillet, pale lemon mayonnaise, shredded lettuce, toasted brioche bun |
| `veggie.jpg` | Vegetarian burger on a brushed steel diner counter, three-quarter angle, deep magenta beetroot and chickpea patty with visible texture, melted pale vegan cheese, green leaves, seeded bun |
| `fritas.jpg` | Rustic skin-on french fries piled in a red plastic diner basket lined with paper, top-down, coarse salt and rosemary sprigs, on a cream formica table |
| `onion-rings.jpg` | Golden battered onion rings stacked in a red plastic diner basket lined with paper, top-down, crisp craggy batter, on a cream formica table |
| `milkshake.jpg` | Vanilla milkshake in a tall classic fluted glass, three-quarter angle, thick swirl of whipped cream on top, condensation on the glass, cream formica table, brushed steel behind |
| `refrigerante.jpg` | Ice-cold cola in a tall clear glass with ice cubes, three-quarter angle, heavy condensation running down, cream formica table |
| `brownie.jpg` | Warm chocolate brownie with a scoop of vanilla ice cream melting over it, top-down, on a small white plate, cream formica table, visible fudgy crumb |
| `attract.jpg` (9:16) | Vertical shot of an empty American diner counter at golden hour, brushed steel and cream formica, red stools out of focus, warm bulbs bokeh in the upper third, **calm dark area across the vertical middle** for the brand wordmark, no people, no text |

### Depois de gerar

1. Salvar em `public/demo/maxburger/` com os nomes exatos da tabela — os
   caminhos já estão em `src/demo/tenants.ts` e o teste reprova se um produto
   apontar para a pasta de outra casa.
2. `npm test` — trava preço, categoria e a pasta de cada foto.
3. Abrir `?tenant=maxburger` e olhar a **grade inteira**, não uma foto por vez.
   O defeito que só aparece na grade é a inconsistência, e é o único que
   importa.

## Café Sabor — as duas que faltam

Direção de arte da casa, já estabelecida pelas fotos que existem: **luz de
janela, difusa e quente**, madeira clara, cerâmica fosca, fundo desfocado de
cafeteria. O oposto da luz dura da lanchonete. Ângulo de três quartos, à altura
da mesa.

Sufixo comum:

> shot on 50mm, f/2.8, soft diffused window light, warm white balance, matte
> ceramic on light wood table, blurred cafe interior behind, no text, no logos,
> no hands, no people, centred subject with generous margin, 4:3 landscape

| Arquivo | Prompt |
|---|---|
| `matcha-latte.jpg` | Hot matcha latte in a matte sage ceramic cup on a light wood cafe table, three-quarter angle, vivid green tea meeting steamed milk in a soft gradient, delicate leaf latte art, faint steam |
| `matcha-gelado.jpg` | Iced matcha latte in a tall clear glass on a light wood cafe table, three-quarter angle, vivid green matcha layered over cold milk and crushed ice, condensation on the glass |

## As logos

Uma por casa, em `public/demo/<casa>/logo.png`. O tema aponta para ela em
`logoUrl` (ver `src/design/theme.ts`), e o attract troca o nome tipografado pela
logo — nunca mostra os dois. Logo e wordmark juntos são a mesma marca dita duas
vezes, e a segunda sempre contradiz a primeira: a logo já decidiu peso, caixa e
espacejamento, e o `type-display` decide tudo de novo com outros valores.

### Qual modelo, e por quê

Cinco candidatos, cada um posto na MESMA tela inicial, com o mesmo pôster e o
mesmo scrim. Comparar logo fora do lugar onde ela vai viver é escolher tinta
pelo catálogo.

| Modelo | O que entregou |
|---|---|
| `fal-ai/recraft/v4.1/text-to-vector` | SVG de verdade, transparente, texto correto. **Mas escolheu a cor sozinho**: pediu-se lettering off-white com acento tijolo e veio tudo laranja — que aterrissou em cima da boca do forno, laranja sobre laranja. |
| `ideogram/v4` | Desenho e tipografia excelentes. O fundo "preto" saiu quase-preto, e o recorte deixou um retângulo cinza visível sobre o pôster. |
| `fal-ai/flux-2-max` | Obedeceu à paleta e ao preto de verdade. Marca gráfica correta, mas genérica — a cafeteria saiu com uma sans pesada que qualquer casa poderia usar. |
| `openai/gpt-image-2.5/flare` | Muito bom, e o ÚNICO com `background: "transparent"` nativo — dispensa o recorte. Perdeu no desenho: um arco de doze tijolinhos que a três metros vira uma mancha. |
| **`fal-ai/gemini-3-pro-image-preview`** (Nano Banana Pro) | **Escolhido, nas três casas.** Foi o único que respondeu à PERSONALIDADE de cada uma em vez de aplicar um estilo só: a cafeteria veio delicada e espaçada, a pizzaria veio quente e sólida, a hamburgueria veio alta e chapada. Marcas simples, que é o que sobrevive à distância de um corredor de feira. |

O critério de desempate não foi "qual é a mais bonita em tela cheia", foi **qual
ainda se lê a três metros**. Um totem é visto de longe antes de ser tocado, e
detalhe fino é a primeira coisa que a distância come — foi o que reprovou o arco
de tijolinhos do GPT.

### Fundo preto e alfa depois

Nenhum modelo bom em TIPOGRAFIA gera fundo transparente. Os que geram vetor
erram menos no texto mas escolhem a cor sozinhos; os que acertam o texto
entregam um retângulo opaco.

Então a logo é pedida **sobre preto puro** e o alfa é recuperado depois:

```
node scripts/logo-alpha.mjs entrada.png public/demo/<casa>/logo.png [piso]
```

A alternativa era `mix-blend-mode: screen` no CSS. Funciona — enquanto o fundo
for escuro. O pôster da cafeteria é uma sala clara de manhã, e ali o `screen`
apaga a logo inteira. Um recurso que serve duas das três casas não é um
recurso, é uma armadilha esperando a terceira.

O script despremultiplica a cor (divide pelo alfa) para devolver o tom cheio, e
recorta a margem por uma máscara de alfa alto — um recorte ingênuo enxerga o
grão do "preto" como opaco, não corta nada, e a sobra chega na tela como uma
costura vertical fantasma.

O Nano Banana Pro não aceita semente, então as três logos **não são
reproduzíveis** — o que existe é o prompt. Foram geradas com piso `24`.

> O `gpt-image-2.5/flare` dispensa o script inteiro (`background: "transparent"`,
> `output_format: "png"`). Se um dia o recorte atrapalhar mais do que ajuda, é
> para lá que se muda.

Os prompts pedem, os três: nome exato entre aspas, uma marca gráfica simples
acima, duas cores só, **fundo preto sólido com margem generosa**, e nada de
gradiente, moldura, selo, fita ou tagline. A tagline já está na tela, em
tipografia de verdade, logo abaixo da logo.

> `CAFE SABOR` sai sem acento de propósito: modelo de imagem erra acento com
> frequência, e um "CAFÉ" torto é pior que um "CAFE" limpo. A tela continua
> escrevendo "Café Sabor" com acento em todo lugar que é texto.
