# Ligar um totem a um tenant

O que o painel precisa que exista antes de vender qualquer coisa.

## 1. Usuário de aparelho

O totem **não usa RPC anônima nem `service_role`**. Ele autentica como ele
mesmo: um usuário que é membro do tenant, com o papel mais baixo que carrega
`catalog.read` e `orders.create` (hoje, `staff`).

Isso mantém a RLS intacta, dá autor ao pedido, e faz de revogar um totem uma
operação de um clique.

Exemplo aplicado no Artorius:

```
email  totem.artorius@fayalabs.com
papel  staff  (all_units = true)
```

A senha vive só no `.env` do painel, que nunca sai da máquina — mesmo nível de
confiança do caixa: quem lê o disco do totem já consegue levar o dinheiro dele.

> Um usuário por totem, não um por rede. A rastreabilidade e a revogação valem
> mais do que o trabalho de criar mais um.

## 2. Cardápio

O totem **lê; ele não inventa**. Se o tenant não tem cardápio, a tela mostra o
erro — nunca um menu de mentira, porque um quiosque que inventa cardápio aceita
pedido que a cozinha nunca vê.

Precisa existir:

| | |
|---|---|
| **Categorias ativas** | Qualquer `kind`. O provider lê todas as ativas e descarta as que não têm produto vendável — uma aba vazia num quiosque é um beco sem saída na frente da fila. |
| **Produtos com preço > 0** | Preço zero é ingrediente que alguém digitou no catálogo, não algo que o cliente compra. São filtrados. |
| **Fotos** | `products.image_url`. Um totem cuja proposta é a imagem da comida com cards cinzas não vende. URL quebrada cai para o ícone, mas isso é rede de segurança, não plano. |
| **`menu_items`** | Opcional. Sem a linha, o item conta como disponível. Com ela vêm `status` (`sold_out` aparece apagado e inerte, nunca some) e `is_featured`. |
| **Modificadores** | `menu_modifier_groups` + `menu_modifiers` + `menu_item_modifier_groups`. `is_required` bloqueia o botão dizendo qual grupo falta. |

## 3. Variáveis

```
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY   pool do tenant
VITE_TENANT_ID                                     tenant
VITE_UNIT_ID                                       unidade (opcional)
VITE_TOTEM_ID                                      um por aparelho
VITE_TOTEM_DEVICE_EMAIL / _PASSWORD                usuário de aparelho
VITE_TOTEM_CATALOG=live|demo                       demo é dev/CI, NUNCA fallback
```

## Estado do Artorius (01/09/2026)

Semeado para teste, tudo com `metadata.seeded_by='chef-totem'`:

- 4 categorias ativas · **17 produtos vendáveis, todos com foto**
- 3 grupos de modificadores (ponto da carne, acompanhamento incluso, adicionais)
  ligados às 8 carnes
- 1 item marcado `sold_out` (Limonada Suíça) para a tela provar o caso
- 2 itens em destaque

Para remover o seed: apagar as linhas com `metadata->>'seeded_by' =
'chef-totem'` e limpar `image_url` onde `metadata->>'image_seeded_by'` existir.
