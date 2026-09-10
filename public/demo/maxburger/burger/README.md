# Montador MaxBurger — 21 recortes

Gerados pelo **gerador nativo de imagens da OpenAI no Codex**, em 10/09/2026. A ferramenta não informou o modelo específico. Nenhum destes assets é do Higgsfield.

Prompts finais completos, gerador e identificação dos masters em `prompts.json`. Masters preservados em `/Users/fayalabs/.codex/generated_images/01a08cb6-97c4-7f81-977c-082e7b58d98d/`.

Arquivos finais: 6 metades de pão (brioche, australiano e sem glúten), 4 proteínas (blend, smash, frango e vegetal), 3 queijos (cheddar, prato e vegetal), alface, tomate, cebola roxa, cebola crispy, bacon, ovo, molho da casa e maionese de limão. Cada WebP tem 1024 pixels de largura e alfa real validado. O manifesto `assets.json` registra as dimensões após remoção apenas da margem transparente e codificação WebP.

Algumas tentativas com referência visual produziram fundo quadriculado pintado. Elas foram rejeitadas; os arquivos finais foram regenerados com transparência real, não recortados a partir do quadriculado.

O cheddar já tem bordas caídas. Na cena, ele acompanha a carne tanto no estado aberto quanto no fechado, mantendo o mesmo encaixe. Não há simulação física de derretimento nem deformação inventada da carne.

O tenant de demonstração abre em `/?tenant=maxburger`. Após a identificação, o montador é oferecido uma vez por visita. O toggle “Foto / Montagem 3D” compara uma imagem estática da composição com a cena de recortes flutuantes. É um efeito **2,5D**, não geometria/WebGL nem rotação livre de 360°. O experimento geométrico removido anteriormente não foi reconstruído.

Receitas, pães e extras usam o mesmo resolvedor no montador, miniaturas do menu e carrinho. A foto estática é composta e armazenada em cache no navegador, sem nova geração ou chamadas remotas. Preços originais dos pães/extras são preservados; retiradas dos ingredientes incluídos são opções explícitas sem desconto. O veggie permanece esgotado. A cebola roxa é asset de showcase: não foi adicionada como ingrediente vendável sem uma regra de catálogo.

O showcase de desenvolvimento continua em `/?tenant=maxburger&burger-pilot`, com as cinco receitas e os três pães; não cria pedidos. O fluxo integrado usa o carrinho existente e o pagamento de demonstração. Nenhum cadastro remoto/estoque de produção foi alterado.

Preparação mecânica reproduzível: `BURGER_SHARP_PATH=/caminho/para/sharp node scripts/prepare-burger-asset.mjs nome /caminho/master.png`. O script não faz edições criativas e rejeita imagens opacas.

Validação desta integração: build de produção, 111 testes unitários e 32 cenários de navegador passaram. Inclui as 120 combinações receita × pão × subconjunto de extras no resolvedor, os 15 pares receita/pão no showcase, drag out/in com recálculo, teclado após arrasto, reedição, cancelamento, estoque, fallback de asset, movimento reduzido, pagamento de demonstração e regressões de pizza/tenants. O build mantém os avisos existentes de bundle acima de 500 kB e importação dinâmica também estática de `device-session`. Nenhum teste equivale a medição de 60 fps ou validação de alcance no aparelho físico.

Prévias do tenant: `docs/previews/burger-tenant-australian-open.png` e `docs/previews/burger-tenant-australian-closed.png`.
