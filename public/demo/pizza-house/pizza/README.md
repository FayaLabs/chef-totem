# Assets do montador de pizza

Gerados em 10/09/2026 pelo **gerador nativo de imagens da OpenAI no Codex**. Não são resultados do Higgsfield: a chamada ao Higgsfield retornou saldo insuficiente. A ferramenta nativa não informou um nome de modelo específico.

Todos os arquivos finais abaixo são WebP 1024 × 1024 com alfa real, verificado antes de publicação. Total aproximado: 2,47 MiB. Masters originais preservados no diretório de imagens geradas do Codex. O aplicativo referencia apenas os arquivos deste projeto.

| Arquivo final | Master gerado | Tamanho |
|---|---|---:|
| board.webp | exec-1c09c011-4a7a-4e29-95ff-f721ece1416d.png | 308.312 bytes |
| calabresa.webp | exec-5039e31d-1a7f-49ba-a583-b2d8f61571fa.png | 484.124 bytes |
| pepperoni.webp | exec-fc3501a5-14b2-457b-80d7-62cc9fe390a0.png | 444.006 bytes |
| margherita.webp | exec-147c1716-4f36-4518-9ec1-2b075cac809b.png | 424.626 bytes |
| diavola.webp | exec-d36d51eb-2f67-41ac-8cf5-55c9dcc87ef1.png | 453.666 bytes |
| quatro-queijos.webp | exec-40e4e6e7-9f18-4aaa-aecf-ed802dc02028.png | 468.876 bytes |

## Direção dos prompts

Briefing comum: fotografia gastronômica realista, vista ortográfica perpendicular, pizza circular inteira centralizada, borda tostada visível, iluminação suave do alto à esquerda, escala e enquadramento consistentes. Isolar com transparência real; sem prato, tábua, mãos, fumaça, texto ou logotipo incorporados. A fumaça e a tábua pertencem a camadas do aplicativo.

- Calabresa: calabresa em rodelas, muçarela, cebola e orégano.
- Pepperoni: conservar câmera e borda de referência; trocar cobertura por pepperoni e queijo.
- Margherita: tomate, muçarela e manjericão, conservando centro e escala.
- Diavola: salame picante, pimenta vermelha e mel, mesma vista superior e borda.
- Tábua: madeira escura natural, redonda, sem cabo, pizza ou objetos; vista superior e alfa real.
- Quatro Queijos: o prompt final completo está abaixo. Duas variantes com quadriculado pintado foram rejeitadas; não entraram no projeto.

## Prompt final de Quatro Queijos

> Use case: product-mockup. A single photorealistic Brazilian QUATRO QUEIJOS pizza asset for an interactive touch ordering kiosk. True orthographic 90 degree top-down photograph, centered round pizza occupying 94 percent of a square frame, entire crust visible, consistent round circle, generous golden blistered Neapolitan crust. Topping is only melted mozzarella, parmesan, gorgonzola blue cheese and creamy provolone, browned bubbling cheese with very sparse oregano. No meat, no onions, no tomatoes, no basil. Soft neutral studio light from top-left, extremely appetizing genuine food photography with crisp details. CRITICAL: TRANSPARENT BACKGROUND with genuine alpha channel, not a painted checkerboard, not white, not black. Pizza only isolated cutout, no board, no plate, no scene, no shadow outside the pizza, no steam, no text.

## Composição e preparação

As metades são máscaras CSS complementares sobre as fotografias completas, não novos arquivos gerados. A miniatura do carrinho reaproveita exatamente a composição escolhida. Fotos são ilustrativas e não constituem garantia de aparência ou composição alimentar do produto real.

O script `scripts/prepare-pizza-asset.mjs` valida alfa e apenas redimensiona/codifica os masters com Sharp. Os arquivos finalizados não dependem do caminho do master, da conexão com Higgsfield ou de credenciais de geração.
