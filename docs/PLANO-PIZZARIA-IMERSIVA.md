# Montagem de pizzas no totem

Revisão final de direção: 10/09/2026. Implementada no ambiente local; ainda requer ensaio no painel físico da feira.

## Direção aprovada durante a execução

A montagem é uma especialização do painel de produto existente. Não existe uma UX separada de pizzaria: identificação, cardápio, categorias, filtros, assistente, carrinho, pagamento e recibo continuam no fluxo do totem. A primeira proposta de menu exclusivo foi retirada após o feedback.

A pizza deve ser apetecível e responder ao toque, sem virar uma tela de instruções. O impacto desejado é “WOW”, mas a reação de visitantes só pode ser confirmada por ensaio com pessoas.

## Jornada implementada

1. Identificar-se ou continuar como visitante pelo fluxo existente.
2. Após identificar ou pular identificação, a primeira montagem abre automaticamente, antes de o cliente explorar o cardápio. Isso acontece uma vez por visita. Tocar depois em qualquer produto de pizza também abre sua montagem dentro do mesmo Sheet.
3. A abertura automática vem vazia, sem Calabresa ou outro sabor pré-selecionado. A primeira metade recebe um realce translúcido. Quando o cliente abre um produto específico pelo cardápio, esse produto serve de escolha inicial; a abertura automática nunca conta como escolha.
4. Escolher o primeiro sabor preenche essa metade e avança automaticamente para a segunda.
5. Escolher o segundo sabor completa a composição. Tocar em qualquer metade da pizza permite voltar e editar; os resumos com miniaturas oferecem a mesma ação abaixo da imagem.
6. “1 sabor” volta a uma pizza inteira e remove o adicional do segundo sabor. “2 sabores” permite meio a meio.
7. Escolher tamanho, adicionais globais e quantidade. O total acompanha as escolhas.
8. Adicionar gera uma única linha; uma animação curta entrega a mesma composição ao carrinho existente. O montador fecha e libera o cardápio para bebidas, sobremesas ou outra pizza, sem reabrir sozinho. Não é uma confirmação de preparo real.
9. “Editar sabores” reabre a composição, preservando tamanho, quantidade e adicionais; salvar substitui a linha. Cancelar a edição preserva o pedido.

## Cena e movimento

- Tábua e pizza centralizadas horizontal e verticalmente no espaço fotográfico.
- Fundo cinza-escuro somente na prévia. O resto do painel mantém o design existente.
- Tamanho individual (25 cm) diminui apenas a pizza sobre a tábua. Média (30 cm) preenche a área útil. Grande (35 cm) amplia pizza e tábua juntas em aproximadamente 30%, com zoom mais expressivo aprovado pelo usuário. Transições de 600 ms mantêm centro, composição e giro. Os diâmetros vêm dos metadados das opções do catálogo, não de comparação de textos.
- Sem texto ensinando a girar. O gesto deve ser descoberto.
- Sem botões de girar para a esquerda, parar ou girar para a direita, conforme decisão explícita do usuário.
- Rotação automática: aproximadamente 8 graus por segundo, uma volta em 45 segundos.
- Trocar sabores NÃO para a pizza nem zera o ângulo: a velocidade converge suavemente para 2 graus por segundo durante 2,6 segundos e retorna a 8.
- Arrastar controla diretamente a rotação angular de tábua e pizza juntas. Ao soltar, há inércia amortecida; depois o giro ambiente retorna.
- Pinça aproxima até 1,8× e limita o afastamento a 0,9× do tamanho escolhido. Enquanto houver dedos na pizza, o enquadramento é mantido. Após 3 segundos sem interação, retorna ao normal em 750 ms; um novo toque interrompe esse retorno sem salto. Trocar o tamanho redefine a referência. Sem instruções ou botões visíveis adicionais.
- Pinça, inclusive quando um dedo é retirado antes do outro, não escolhe metades. Cancelamento libera a captura. Movimento reduzido mantém o zoom direto e dispensa a animação de retorno.
- Toque curto escolhe a metade. Arraste não altera sabor nem adiciona nada ao pedido.
- A escolha por toque considera a orientação atual: o lado visual pode mudar durante o giro.
- Marcadores de metade ficam legíveis, sem girar o texto de cabeça para baixo.
- Vapor sutil em camada independente. Respeitar movimento reduzido e interromper efeitos em aba oculta.
- Imagens da pizza usam máscaras complementares e transição curta de opacidade. Não são vídeos ou geração em tempo real.

## Dados e preço

Capacidade ativada por produto com metadado `pizza`, inicialmente no catálogo demonstrativo Pizza House. Bebidas, calzones, sobremesas e outros tenants mantêm o detalhe genérico.

Política comercial preservada: preço do produto-base + acréscimo do segundo sabor + tamanho + adicionais, multiplicado pela quantidade. A ordem dos sabores pode afetar o preço nesta política; não foi substituída silenciosamente por média ou maior preço.

Sabores têm IDs do catálogo. Composição estruturada acompanha carrinho e metadados do pedido; os dois sabores aparecem no nome enviado à cozinha. Não é criado um SKU novo por combinação.

Voz e toque usam o mesmo rascunho. A ferramenta `choose_pizza_flavor` altera primeira metade, segunda metade ou pizza inteira; não adiciona e não paga. O snapshot informa as duas metades e qual está ativa.

## Mídia

Assets em `public/demo/pizza-house/pizza/`: tábua, Calabresa, Quatro Queijos, Margherita, Pepperoni e Diavola. WebP 1024 × 1024, com transparência real verificada. As dez combinações distintas derivam das mesmas cinco pizzas.

As imagens geradas são também as fotos dos cinco produtos no cardápio, com enquadramento inteiro (sem cortar a pizza). O montador, os sabores e o carrinho reutilizam os mesmos assets. Os outros produtos mantêm suas fotos e o layout do menu não muda.

Higgsfield estava conectado, mas a tentativa de geração falhou por saldo insuficiente. Os assets implementados foram gerados pelo gerador nativo da OpenAI no Codex. Não foram gerados vídeos Higgsfield.

Prompts, proveniência e observações em `public/demo/pizza-house/pizza/README.md`. O script `scripts/prepare-pizza-asset.mjs` apenas verifica alfa, redimensiona e codifica em WebP; não inventa transparência em imagens com quadriculado pintado.

O catálogo pré-carrega e decodifica as camadas durante as telas anteriores. A compra não depende de chamar um modelo ou de gerar mídia.

## Verificação

- Testes unitários: composição, preço, avanço de seleção, volta para edição, substituição da linha, cancelamento sem perda, disponibilidade e giro cruzando ±180 graus.
- Navegador em 1080 × 1920: menu preservado, montagem, troca de metades por toque na pizza, arraste, pinça multitouch com limites e retorno interrompível, desaceleração sem parada, retomada, imagens carregadas, consistência dos cinco sabores entre menu e montador, alinhamento central e alvos de toque.
- Movimento reduzido, produtos não-pizza, outro tenant e entrada no pagamento existente.
- Regressões: carrinho, tamanhos/adicionais, cliente reconhecido, ofertas/créditos, pagamento demonstrativo e recibo.
- A reação emocional, o brilho do salão e a ergonomia no vidro de 27 polegadas ainda precisam ser avaliados no aparelho físico. Não foram tratados como comprovados por screenshots.
