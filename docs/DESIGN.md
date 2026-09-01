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

**Nada interativo acima de 40% da altura.** O topo é vitrine: foto, título,
marca. O comando mora embaixo.

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
