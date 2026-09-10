# Montador de burger em camadas

Status em 10/09/2026: pacote de 21 recortes integrado ao tenant **de demonstração** MaxBurger, em `/?tenant=maxburger`. Inclui três pães, cinco receitas (veggie ainda esgotado), extras, retiradas, entrada uma vez por visita, edição no carrinho e ícones de burger montado / camadas. É uma composição 2,5D de recortes flutuantes; a geometria removida anteriormente não foi recriada. Essa interpretação foi explicitada ao iniciar a integração. Assets gerados pelo gerador nativo da OpenAI, não pelo Higgsfield, com alfa real.

Prévia fixa centralizada, ícones discretos absolutos à direita e sombra de contato compartilhada com a imagem estática. Escolher receita, pão ou ingrediente abre as camadas por 2,6 segundos, renova o intervalo nas escolhas seguintes e fecha em 650 ms; segurar um gesto pausa o fechamento. Adicionar fecha visualmente e leva o burger ao carrinho, sem condicionar a gravação à animação e respeitando movimento reduzido.

Interação: tocar numa camada expandida a seleciona; arrastar para fora retira ingredientes opcionais e extras. A bandeja “Fora do burger” permite recolocar por arrasto ou toque. No fluxo de compra, retirada de ingrediente incluído registra “Sem…” e retirada de extra desfaz a cobrança; pão/proteína levam às opções de troca, sem criar um produto sem pão/carne e sem preço. No showcase visual, todas as partes continuam removíveis e a carne leva o queijo consigo. Há controles equivalentes por botão, teclado, cancelamento e movimento reduzido.

### Ajuste após a observação sobre queijo derretido

O cheddar já é gerado com as bordas caídas e permanece apoiado na carne nos dois estados. Ambos compartilham posição relativa e grupo de flutuação; pão, bacon e cebola se afastam separadamente. Não simular uma fatia rígida que magicamente derrete ao fechar. A camada de queijo continua removível/editável, mas não se desprende sozinha da carne.

Prévias e evidências em `docs/previews/` e nos resultados dos testes de navegador. Assets e prompts completos em `public/demo/maxburger/burger/README.md` e `prompts.json`. Validação automatizada cobre resolvedor, preços, edição, estoque, gestos e alternância; não substitui painel físico. O plano abaixo registra também evoluções: pinça/zoom do burger e paralaxe ainda não foram implementados. O carrinho recebe imediatamente uma miniatura estática fiel às escolhas, pelo contrato existente.

## Direção

Especializar o Sheet de produto existente para o MaxBurger, como foi feito na Pizza House. Preservar identificação, cardápio, categorias, tema, assistente, carrinho, pagamento e área de alcance do totem. O efeito principal é um burger fotografado em perspectiva, aberto em camadas suspensas, que se fecha de forma convincente.

Não tratar a reação “WOW” como comprovada por uma imagem. Validar apetite, legibilidade e resposta ao toque no painel físico antes da feira.

## Jornada (direção original; status acima delimita a entrega)

1. No MaxBurger, oferecer a mesma entrada de montagem após identificação, uma vez por visita. Abertura automática apresenta as receitas disponíveis para escolha explícita; não criar um SKU “monte do zero” sem preço e regras. Abrir um produto pelo cardápio já define sua receita-base.
2. Mostrar a receita aberta em camadas. Ingredientes da receita são incluídos por definição; pão, ponto e extras não são escolhas silenciosas. Quando faltar escolha obrigatória, a prévia é ilustrativa e os controles deixam a pendência clara.
3. Escolher o pão troca topo e base juntos: Brioche, Australiano, Sem glúten. Seleção única avança o foco para o próximo grupo obrigatório, sem trocar de página ou rolar abruptamente o painel.
4. Escolher o ponto somente quando aplicável à receita. Os controles permanecem revisitáveis. Frango e veggie não recebem pergunta de ponto.
5. Extras opcionais ficam próximos da montagem: adicionar bacon, cheddar ou ovo faz aparecer a porção correspondente; “sem cebola” retira a camada da receita que de fato contém cebola. Nenhuma pergunta obrigatória sobre alface, tomate ou molho já incluídos.
6. Controle secundário “Camadas / Montado” permite fechar e reabrir sem adicionar. Tocar em uma camada foca o grupo correspondente; controles equivalentes continuam na região alcançável da tela.
7. “Adicionar · R$ …” é o único compromisso com o pedido. Fecha a composição visual, entrega sua miniatura ao carrinho e libera o menu para acompanhamentos. A gravação no carrinho é imediata e única, independente do fim da animação; não representa envio à cozinha.
8. Editar no carrinho restaura a composição e as escolhas. Cancelar mantém a linha anterior. Não reabrir o montador automaticamente ao voltar ao menu nessa visita.

## Cena e interação

- Fotografia em perspectiva frontal elevada, aproximadamente 20–25° acima da horizontal, com câmera travada. Evitar a vista superior da pizza: ela esconderia as laterais e o empilhamento do burger.
- Composição 2,5D: recortes fotográficos com profundidade aparente, não modelo tridimensional real. Flutuação vertical e paralaxe discreta; sem giro livre de 360°, que mostraria a ausência de volume dos recortes.
- Enquadramento estável, fundo cinza-escuro somente na prévia, controles com os tokens atuais do MaxBurger. Pão superior, toppings, queijo, proteína e pão inferior têm posições abertas e fechadas definidas por receita.
- No estado aberto, espaçamento legível sem empurrar os controles para fora da zona de alcance. Limitar altura da pilha: extras ajustam os espaços internos; não diminuem os botões.
- Entrada proposta de 600–750 ms; movimento ambiente mínimo e coordenado, tratando o burger como uma única cena, não vários elementos disputando atenção.
- Troca de ingrediente em aproximadamente 200–300 ms. Bacon extra entra como porção adicional; duas carnes instanciam duas camadas, sem gerar uma imagem por combinação.
- Fechamento em aproximadamente 650 ms: camadas convergem com pequeno escalonamento, queijo acomodado entre carne e pão, sombra de contato reforçando peso. Sem quique de brinquedo ou queijo esticado artificialmente.
- Novas escolhas interrompem e redirecionam a animação vigente a partir do quadro atual. Nunca enfileirar efeitos atrasados para opções já desmarcadas.
- Pinça reaproveita a regra aprovada na pizza: escala relativa de 0,9× a 1,8×, retorno após 3 segundos sem interação em 750 ms. Gestos não alteram ingredientes por acidente. Sem mensagens ensinando a manipular.
- Movimento reduzido mantém todas as escolhas e os estados aberto/fechado, sem animação ambiente ou transições obrigatórias. Aba oculta pausa a cena.

## Inventário de imagens

Planejamento: **21 recortes aprovados e reutilizáveis**, suficientes para representar os ingredientes descritos no catálogo atual, inclusive os da receita veggie ainda esgotada. Disponibilidade e escolha do cliente continuam independentes da existência de uma imagem.

| Grupo | Assets individuais | Quantidade |
|---|---|---:|
| Pães | Brioche, australiano e sem glúten; topo e base separados para cada um | 6 |
| Proteínas | Blend alto, disco smash, filé de frango crocante, disco veggie | 4 |
| Queijos | Prato derretido, cheddar cremoso, queijo vegetal | 3 |
| Vegetais | Alface, tomate, cebola em anéis, cebola crispy | 4 |
| Extras | Porção de bacon, ovo | 2 |
| Molhos | Molho da casa, maionese de limão | 2 |
| **Total** | | **21** |

Não são 21 burgers prontos nem 21 arquivos por combinação. As composições fechadas para menu e carrinho derivam desses mesmos recortes, mantendo consistência visual desde o primeiro dia. Miniaturas exportadas não exigem novas gerações.

O número é de assets aceitos, não de chamadas ao gerador: considerar revisões e tentativas rejeitadas. Orçamento e provedor precisam ser conferidos na produção; nenhuma estimativa monetária sem preços/saldo verificados.

### Ponto da carne

O catálogo contém “Ao ponto”, “Ao ponto para menos” e “Bem passado”, não “Malpassado”. Preservar essas opções até validação da operação. O Smash Duplo também recebe hoje o grupo de ponto: confirmar se isso corresponde ao preparo que a cozinha oferece antes de expandir o fluxo.

O ponto deve alterar a instrução estruturada do pedido. Não simular que é possível verificar o interior apenas escurecendo a superfície do disco. Inicialmente, um único recorte externo de blend atende aos três pontos; a seleção fica clara no controle e no resumo. Se a direção artística pedir explicação visual adicional, considerar **três imagens de corte ilustrativo**, elevando o pacote a **24**, sem representá-las como prova do preparo real.

### Contrato visual de cada recorte

- Mesma câmera, escala de referência, direção de luz, temperatura de cor e centro horizontal. Um diâmetro físico de referência, com largura e espessura próprias por ingrediente.
- Ingrediente inteiro, isolado, sem mãos, pratos, textos, fumaça ou outros ingredientes colados nele. Bacon e cebola podem ser porções compostas de várias tiras/anéis, mas apenas desse ingrediente.
- Alfa verdadeiro. Rejeitar fundo quadriculado pintado, halos claros e sombras externas incorporadas que dificultem o empilhamento.
- Sombras de contato e oclusão controladas pela cena. Uma imagem de carne não deve trazer queijo junto, pois o queijo precisa ser editável.
- Masters com resolução suficiente para o close; entregar WebP com alfa e versões menores para miniaturas. Medir o custo de decodificação e memória, não apenas o tamanho em disco.
- Manifesto de assets com âncora, caixa útil, escala, ordem da camada e espessura fechada. Isso evita corrigir cada receita com offsets arbitrários espalhados no JSX.
- Registrar gerador, prompts, referências e arquivos aprovados. Não atribuir ao Higgsfield algo produzido por outro gerador.

## Sequência de preparação e implementação

### 1. Piloto visual de seis assets

Gerar topo e base do brioche, blend, cheddar, cebola e bacon. Esses seis fazem parte dos 21; não são seis adicionais. Montar uma cena de prova aberta e fechada antes de gerar o restante.

Portão de aprovação: burger fechado deve parecer um produto fotografado coerente; aberto deve permitir distinguir cada ingrediente. Se câmera, contato ou escala não encaixarem, corrigir o piloto e suas referências antes de produzir o lote.

### 2. Receitas e regras explícitas

Cadastrar metadados de composição nas receitas Max Clássico, Cheddar Bacon, Smash Duplo, Frango Crocante e Veggie do Chef. Não inferir ingredientes lendo nomes ou descrições durante o render.

Preservar preços e grupos existentes. Trocar receita/proteína segue o produto do catálogo; “carne extra”, outro queijo ou novas substituições só aparecem quando houver modificador, preço e disponibilidade definidos. Retirada de cebola não deve aparecer em receita sem cebola. Quantidades visuais precisam corresponder à porção vendida.

Separar o estado comercial do rascunho — receita, pão, ponto, adicionais e retiradas — do estado visual temporário — aberto/fechado, zoom, foco e animação. O carrinho nunca depende de um callback de animação.

### 3. Produção do restante do pacote

Completar os outros 15 assets a partir do piloto aprovado; revisar cada um sobre fundo claro e escuro e no empilhamento final. Reutilizar as referências visuais em todas as gerações. Gerar as miniaturas do menu a partir das composições fechadas.

### 4. Integração ao totem

Propor `BurgerProductSheet`, `BurgerStage` e `BurgerVisual`, com um manifesto e um resolvedor puro de camadas compartilhado por prévia, menu e carrinho. Reutilizar os controles de produto, grupos de modificadores, regras de preço, edição, assistente e infraestrutura de gesto existentes. Evitar copiar o store da pizza inteiro ou refatorar todos os produtos nesta entrega.

Animações usam preferencialmente `transform` e `opacity`, sem recalcular a altura/layout do formulário a cada quadro. Valores de movimento não devem provocar render React de todos os controles em cada frame. Essa abordagem segue as orientações oficiais de [performance do Motion](https://motion.dev/docs/performance) e [Motion Values](https://motion.dev/docs/react-motion-value); fluidez real ainda depende de medição no dispositivo.

Assets locais pré-carregados por necessidade; não decodificar as 21 imagens em resolução máxima simultaneamente. O atendimento não chama geradores nem depende de vídeo remoto. Sem necessidade de WebGL ou vídeo nesta primeira versão; geometria real seria uma evolução separada caso se exija visão livre de todos os ângulos.

### 5. Verificação de entrega

- Resolvedor de camadas e preços: todos os pães, receitas, extras, retiradas, composição dupla, grupo de ponto aplicável e itens esgotados.
- Navegador de toque 1080 × 1920: entrada automática uma vez por visita, troca rápida de opções, fechamento/reabertura, pinça e cancelamento, adicionar uma única vez, editar e cancelar sem perda.
- Menu, montador, resumo, assistente e carrinho representam a mesma composição. Pedido inclui ponto e alterações corretas, não apenas uma imagem.
- Imagens carregadas, sem fundos falsos, bordas cortadas indevidamente, ingredientes atravessando outros ou espaços vazios quando fechado.
- Controles com os alvos e zona de alcance definidos em `docs/DESIGN.md`; opção equivalente em controles acessíveis para cada interação sobre a cena.
- Meta de 60 fps no painel alvo, resposta visual imediata ao toque e ausência de travas ao acumular extras. Medir animação, memória e latência de interação no aparelho; não assumir pelo desktop.
- Fallback de imagem ausente e movimento reduzido mantêm a compra funcional. Regressões de pizza, produtos comuns e demais tenants passam.

## Próximo passo delimitado

Validar apetite, legibilidade, alcance e fluidez no totem físico. Antes de levar a um tenant conectado ao catálogo real, mapear os mesmos metadados e modificadores ao provider remoto e confirmar regras da operação. Esta entrega modifica somente o catálogo de demonstração MaxBurger, não o banco de produção.
