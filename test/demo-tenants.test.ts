import assert from 'node:assert/strict'
import { test } from 'vitest'
import { DEMO_TENANTS, DEMO_TENANT_IDS } from '../src/demo/tenants'
import { contrast, defaultTheme } from '../src/design/theme'

// ---------------------------------------------------------------------------
// Os dois tenants de demonstração são DADOS, e dado errado passa despercebido.
//
// Estes testes valem mais do que parecem: são a mesma checagem que o
// `validateKiosk` do @fayz-ai/kiosk faz num documento escrito por um MODELO.
// Aqui os documentos foram escritos à mão, mas o custo de errar é o mesmo — um
// preço zerado, uma foto que não existe, um grupo obrigatório com um item só,
// uma marca que reprova em contraste no salão.
// ---------------------------------------------------------------------------

test('os dois tenants existem e têm identidade própria', () => {
  assert.deepEqual([...DEMO_TENANT_IDS].sort(), ['cafe-sabor', 'zedek'])

  const brands = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].brand.name)
  assert.equal(new Set(brands).size, brands.length, 'duas marcas com o mesmo nome')

  const personas = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].persona.name)
  assert.equal(new Set(personas).size, personas.length, 'dois assistentes com o mesmo nome')

  const actions = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].theme.action)
  assert.equal(new Set(actions).size, actions.length, 'a cor de commit não distingue os dois')
})

for (const id of DEMO_TENANT_IDS) {
  const tenant = DEMO_TENANTS[id]

  test(`${id}: o tema passa no piso de contraste`, () => {
    const theme = { ...defaultTheme, ...tenant.theme }
    // As mesmas três regras de `checkTheme`. Uma marca que reprova aqui é uma
    // tela ilegível às duas da tarde perto da janela.
    assert.ok(contrast(theme.action, '#FFFFFF') >= 4.5, 'ação × branco')
    assert.ok(contrast(theme.ink, theme.page) >= 4.5, 'texto × página')
    assert.ok(contrast(theme.edge, theme.page) >= 3, 'borda × página')
  })

  test(`${id}: todo produto tem foto, preço e categoria que existe`, () => {
    const categoryIds = new Set(tenant.catalog.categories.map((c) => c.id))
    assert.ok(tenant.catalog.categories.length >= 3, 'menos de três categorias não exercita a trilha')

    for (const product of tenant.catalog.products) {
      assert.ok(product.priceCents > 0, `${product.name} sem preço`)
      assert.ok(product.imageUrl, `${product.name} sem foto`)
      assert.ok(
        product.imageUrl?.startsWith(`/demo/${id}/`),
        `${product.name} aponta para a pasta de outro tenant`,
      )
      assert.ok(categoryIds.has(product.categoryId ?? ''), `${product.name} numa categoria inexistente`)
      if (product.compareAtCents) {
        assert.ok(
          product.compareAtCents > product.priceCents,
          `${product.name} com preço riscado MENOR que o de venda`,
        )
      }
    }
  })

  test(`${id}: toda categoria tem pelo menos um produto`, () => {
    // Uma categoria vazia na trilha é um toque que leva a lugar nenhum.
    for (const category of tenant.catalog.categories) {
      const count = tenant.catalog.products.filter((p) => p.categoryId === category.id).length
      assert.ok(count > 0, `${category.name} está vazia`)
    }
  })

  test(`${id}: grupo obrigatório oferece escolha de verdade`, () => {
    for (const product of tenant.catalog.products) {
      for (const group of product.modifierGroups) {
        assert.ok(group.modifiers.length > 0, `${group.name} sem opções`)
        if (group.required) {
          assert.ok(
            group.modifiers.length >= 2,
            `${group.name} é obrigatório com uma opção só — isso é um pedágio, não uma escolha`,
          )
        }
        assert.ok(group.maxSelections >= group.minSelections, `${group.name} com máximo abaixo do mínimo`)
      }
    }
  })

  test(`${id}: ids são únicos dentro do cardápio`, () => {
    const ids = tenant.catalog.products.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length, 'dois produtos com o mesmo id')

    const modifierIds = tenant.catalog.products.flatMap((p) =>
      p.modifierGroups.flatMap((g) => g.modifiers.map((m) => m.id)),
    )
    // Modificadores repetem entre produtos de propósito (os grupos são
    // compartilhados); o que não pode é o MESMO id significar coisas
    // diferentes, então basta que o nome bata.
    const byId = new Map<string, string>()
    for (const product of tenant.catalog.products) {
      for (const group of product.modifierGroups) {
        for (const modifier of group.modifiers) {
          const seen = byId.get(modifier.id)
          assert.ok(!seen || seen === modifier.name, `${modifier.id} tem dois nomes diferentes`)
          byId.set(modifier.id, modifier.name)
        }
      }
    }
    assert.ok(modifierIds.length > 0)
  })

  test(`${id}: a demonstração mostra os estados difíceis`, () => {
    // Um cardápio de demonstração só com o caminho feliz não demonstra design.
    assert.ok(tenant.catalog.products.some((p) => p.soldOut), 'nenhum item esgotado')
    assert.ok(tenant.catalog.products.some((p) => p.featured), 'nenhum item em alta')
    assert.ok(tenant.catalog.products.some((p) => p.compareAtCents), 'nenhum item em promoção')
    assert.ok(
      tenant.catalog.products.some((p) => p.modifierGroups.some((g) => g.required)),
      'nenhum grupo obrigatório',
    )
  })

  test(`${id}: a voz do tenant está completa`, () => {
    for (const [key, value] of Object.entries(tenant.copy)) {
      assert.ok(String(value).trim().length > 0, `copy.${key} vazio`)
    }
    assert.ok(tenant.persona.voice.length > 80, 'persona sem instrução de voz de verdade')
    assert.ok(tenant.persona.accent.length > 40, 'persona sem instrução de sotaque')
    assert.equal(tenant.persona.suggestions.length, 2, 'a faixa mostra exatamente duas aberturas')

    // O roteiro é o que separa um garçom que responde bem de um que vende.
    assert.ok(tenant.persona.playbook.length >= 4, 'roteiro de venda curto demais para ser roteiro')
    for (const step of tenant.persona.playbook) {
      assert.ok(step.trim().length > 20, `passo vago: "${step}"`)
    }
  })

  test(`${id}: o roteiro só promete o que o cardápio entrega`, () => {
    // Instruir o garçom a oferecer meio a meio numa casa que não faz meio a
    // meio é ensiná-lo a mentir — e é no caixa que a mentira aparece.
    const groups = tenant.catalog.products.flatMap((p) => p.modifierGroups.map((g) => g.name.toLowerCase()))
    const playbook = tenant.persona.playbook.join(' ').toLowerCase()
    if (playbook.includes('meio a meio')) {
      assert.ok(groups.some((g) => g.includes('meio a meio')), 'promete meio a meio sem a opção no cardápio')
    }
  })
}
