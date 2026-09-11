# As casas de demonstração

Três restaurantes, um código. Trocar de casa é trocar um objeto
(`src/demo/tenants.ts`), não fazer um fork — e a demonstração inteira existe
para provar isso na frente de quem está avaliando o produto.

Cada casa carrega **marca, paleta, tipografia, elevação, vidro, cardápio,
cópia e a voz do assistente**. Não carrega tamanho de alvo de toque, folga entre
alvos, altura de barra nem a linha da zona de alcance: isso é física de vidro a
82 DPI, não marca. Ver `docs/DESIGN.md`.

## Quem são

| | Café Sabor | Pizza House | MaxBurger |
|---|---|---|---|
| O que é | cafeteria de bairro | pizzaria napolitana | lanchonete de chapa |
| Atende | Bia (`coral`) | Téo (`ash`) | Dudu (`verse`) |
| Página | `#F6F1E7` creme quente | `#EDE9E4` pedra | **`#F5F5F7` neutro frio** |
| Ação | `#4D7C0F` verde | `#C2410C` tijolo | `#FACC15` amarelo |
| Tinta sobre a ação | branco | branco | **`#18181B`** |
| Marca como texto | a própria ação | a própria ação | **`#DC2626`** |
| Display | Archivo, **caixa normal** | Anton, caixa alta, `-0.03em` | **Archivo, caixa alta, `+0.04em`** |
| Raio | 34px | 12px | 30px |
| Elevação | difusa | difusa | **`glass`: larga, baixa, sem cor** |
| Tonalidade do vidro | `#B45309` caramelo | `#C2410C` tijolo | `#FACC15` amarelo |
| Espessura do vidro | **26px** — placa grossa | **14px** — lâmina | 20px — meio-termo |
| Cobertura do vidro | **0,72** | **0,60** — a mais aberta | 0,66 |
| Refração de borda | 14px | 8px | 11px |
| Fotos | `public/demo/cafe-sabor/` | `public/demo/pizza-house/` | `public/demo/maxburger/` |

O VIDRO é o que mais separa as três hoje, porque é a maior superfície do painel:
chip, tecla, cartão de prato, trilha, barra de baixo e os dois cartões de modo
são todos a mesma pane. A cafeteria tem a placa mais grossa e leitosa — 26px de
desfoque deixam passar cor e não deixam passar desenho, que é o que uma casa
calma quer atrás de um menu escrito à mão. A pizzaria tem o vidro mais ABERTO
das três: é uma casa noturna, o forno atrás é o argumento de venda, e um vidro
leitoso na frente de uma foto de brasa joga a foto fora.

O MaxBurger **deixou de ser vintage**, e o que o tornava vintage não era o
amarelo: era o creme de formica na página, o Anton de cartaz no título e, acima
de tudo, a `elevation: hard` — que é por definição a sombra de uma coisa
impressa, adesivo colado na parede. Coerente enquanto a casa era uma lanchonete
de estrada, e incompatível no instante em que o painel virou vidro: um cartão
que se vê ATRAVÉS e que projeta um bloco de tinta pede ao olho que leia
"impresso" e "camada" ao mesmo tempo.

Hoje ela é a casa mais contemporânea das três: página em neutro frio (sobre
creme quente o vidro parece plástico amarelado; sobre neutro frio ele volta a
parecer vidro), raio generoso de 30px, Archivo em caixa alta com espaçamento
aberto — sinalização moderna, e não letreiro — e `elevation: 'glass'`, uma
sombra larga e baixa que desenha distância em vez de bloco.

**O amarelo ficou**, porque não era ele o problema, e porque é ele que prova
sozinho que `onAction` e `actionInk` precisam existir: tinta escura sobre a cor
de ação, vermelho para a marca quando ela é texto. Trocar a família da cor
custaria a demonstração inteira do sistema de tema.

Não há textura de fundo em nenhuma delas. Houve — grão diagonal e listras de
toldo — e saiu: numa grade de dez cartões brancos, o padrão do fundo aparece só
nas frestas, que é onde não há informação, e é a única coisa da tela que se mexe
quando o olho se mexe. O que separa as casas é **cor de página, raio, elevação e
o vidro**, que é o que se lê de longe sem ler nada.

O MaxBurger existe para **quebrar o sistema de propósito**. As duas primeiras
casas eram variações de uma mesma ideia — página clara, tinta escura, commit num
tom quente, sombra difusa — e nenhuma delas provava que o tema aguenta uma marca
que trabalha ao contrário. O botão de pagar amarelo era literalmente impossível
antes: `text-white` fixo no `TotemButton` e `contrast(action, surface)` no
`checkTheme` presumiam que a tinta sobre a cor de ação é branca. Ver os tokens
`onAction` e `actionInk` em `src/design/theme.ts`.

## Trocar de casa

Três caminhos, nesta ordem de precedência:

1. **`?tenant=maxburger` na URL** — o link que se manda antes da feira, e o que
   os testes usam.
2. **O painel de serviço** — grava a escolha e sobrevive a reload.
3. **`VITE_TOTEM_DEMO_TENANT` no `.env`** — o padrão da máquina.

### O painel de serviço

**Toque na etiqueta do canto superior direito** — a que já dizia qual build está
no vidro e agora diz também a casa:

```
● MAXBURGER · CHEFCONTROL TOTEM V1.1
```

Ela está em **todas as telas**, e abre a lista das três casas, a volta para o Ao
vivo, e o que este aparelho é por dentro.

Chegar aqui levou quatro tentativas, e as três primeiras erraram a mesma coisa:

1. Um retângulo transparente no canto. Invisível de verdade — quem precisava
   dele não o achou.
2. Um ponto colorido de 19px. Sumiu igual: sobre um pôster escuro de forno a
   lenha, um ponto discreto é um ponto invisível.
3. Uma etiqueta própria, **logo abaixo** da etiqueta da build. Pior de todas,
   porque parecia resolvido: quem operava o painel via a etiqueta da build —
   que já existia, no mesmo canto, no mesmo material — tocava nela, e nada
   acontecia. Dois chips quase idênticos a três centímetros um do outro, só um
   respondendo, é uma armadilha e não um controle.
4. A própria etiqueta da build é o botão.

A discrição vem de **parecer informação**, não de estar escondida. Ninguém toca
numa etiqueta de versão; quem precisa dela toca primeiro. O alvo tem 88px de
altura e cresce para baixo, para dentro do topo do pôster, onde ninguém toca.

**Só na tela de repouso.** A etiqueta acompanhou todas as telas por um tempo,
com o argumento de que quem precisa dela precisa no momento em que a coisa deu
errado — e isso raramente é no repouso. O argumento estava certo e perdeu para
um mais forte: no cardápio, na identificação e no pagamento, o topo é a parte
que o cliente lê primeiro, e um rótulo de suporte ali cobra espaço de TODO
cliente para servir um operador três vezes por feira. No repouso o espaço é de
graça, e é onde o operador vai olhar de qualquer jeito. O custo é ter de voltar
ao repouso para ler o modo do cardápio — um toque em CANCELAR.

### O que o painel diz sobre o aparelho

Build, modo do cardápio, casa no ar, **de onde veio a escolha** (url, painel ou
`.env`), totem, tenant, unidade, projeto do Supabase, modo do assistente e o
tamanho do palco.

Existe porque quem consegue consertar um totem está de pé na frente dele, sem
console e sem teclado. "Não está pegando o cardápio" tem quatro causas — modo
errado, tenant errado, projeto errado, sessão de aparelho sem senha — e as
quatro se distinguem numa tela de texto. Sem ela, a saída é ligar para alguém
que abra um terminal.

**Senha do aparelho e chave do Supabase não entram.** O painel fica virado para
um salão, e um segredo na tela é um segredo publicado — há um teste que reprova
se algum aparecer.

### "Ao vivo" é uma opção da mesma lista

Escolher uma casa de demonstração **também troca a fonte do cardápio**. As duas
coisas são uma só porque pintar a marca da pizzaria por cima do cardápio do
cliente real é um totem mentindo sobre onde o pedido vai cair.

O caminho de volta está na mesma lista: **Ao vivo**. Sem ele, um painel trocado
numa feira volta para o cliente com a marca errada, e o conserto seria editar a
URL — exatamente o que o seletor existe para evitar.

## Fotos

`public/demo/<casa>/<slug>.jpg`. Uma URL quebrada cai no ícone de talheres, o
que é rede de segurança e não plano: num painel cuja proposta é a imagem da
comida, cartões cinzas não vendem.

Os prompts de geração estão em `docs/IMAGE-PROMPTS.md`.

## O que os testes travam

`test/demo-tenants.test.ts` roda as mesmas checagens que o `validateKiosk` do
`@fayz-ai/kiosk` faria num documento escrito por um modelo: preço maior que
zero, foto na pasta da própria casa, categoria que existe, grupo obrigatório com
escolha de verdade, promoção com preço riscado MAIOR que o de venda, contraste
em AA nos três pares, e o roteiro do assistente só prometendo o que o cardápio
entrega.

Além disso, **as casas têm de ser diferentes**: fonte, caixa, raio, elevação e
os três tokens de vidro formam uma assinatura, e duas assinaturas iguais
reprovam. O vidro entrou na assinatura por ser a maior superfície do painel —
três casas com o mesmo desfoque e a mesma tonalidade são três casas com a mesma
cara, por mais que a paleta diga o contrário. E cada eixo do vidro sozinho tem
de separar as três: uma casa que só se distingue pela tonalidade tem o mesmo
material das outras pintado de outra cor, o que a dois metros é o mesmo
material. O argumento de
"trocar de restaurante é trocar um objeto" só se sustenta se a troca for visível
do outro lado do corredor de uma feira.

`test/demo-mode.test.ts` trava a ordem de precedência acima, e
`e2e/tenant-switcher.spec.ts` trava o que o painel de serviço tem de ser: fácil
de usar com um cliente esperando, incapaz de roubar o toque de quem só quer
comprar, e honesto sobre o modo e a casa — sem nunca mostrar um segredo.
