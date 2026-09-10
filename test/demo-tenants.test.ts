import assert from 'node:assert/strict'
import { test } from 'vitest'
import { DEMO_TENANTS, DEMO_TENANT_IDS } from '../src/demo/tenants'
import { contrast, defaultTheme } from '../src/design/theme'

// ---------------------------------------------------------------------------
// As três casas de demonstração são DADOS, e dado errado passa despercebido.
//
// Estes testes valem mais do que parecem: são a mesma checagem que o
// `validateKiosk` do @fayz-ai/kiosk faz num documento escrito por um MODELO.
// Aqui os documentos foram escritos à mão, mas o custo de errar é o mesmo — um
// preço zerado, uma foto que não existe, um grupo obrigatório com um item só,
// uma marca que reprova em contraste no salão.
// ---------------------------------------------------------------------------

test('as três casas existem e têm identidade própria', () => {
  assert.deepEqual([...DEMO_TENANT_IDS].sort(), ['cafe-sabor', 'maxburger', 'pizza-house'])

  const brands = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].brand.name)
  assert.equal(new Set(brands).size, brands.length, 'duas marcas com o mesmo nome')

  const personas = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].persona.name)
  assert.equal(new Set(personas).size, personas.length, 'dois assistentes com o mesmo nome')

  const actions = DEMO_TENANT_IDS.map((id) => DEMO_TENANTS[id].theme.action)
  assert.equal(new Set(actions).size, actions.length, 'a cor de commit não distingue as casas')
})

test('o design system distingue as casas por mais do que a cor', () => {
  // O teste que faltava quando o tema era só paleta. Duas marcas podiam
  // escolher dois vermelhos parecidos e o painel ficaria idêntico — e o
  // argumento de "trocar de restaurante é trocar um objeto" só se sustenta se
  // a troca for VISÍVEL do outro lado do corredor de uma feira.
  //
  // O VIDRO entrou na assinatura porque ele é agora a maior superfície do
  // painel: chip, tecla, cartão de prato, barra de baixo e os dois cartões de
  // modo são todos a mesma pane. Um material igual nas três casas apagaria de
  // uma vez a diferença que a cor de página e o raio compram — três casas com
  // o mesmo desfoque e a mesma tonalidade são três casas com a mesma cara,
  // por mais que a paleta diga o contrário.
  const fingerprint = DEMO_TENANT_IDS.map((id) => {
    const theme = { ...defaultTheme, ...DEMO_TENANTS[id].theme }
    return [
      theme.displayFont,
      theme.displayCase,
      theme.radius,
      theme.elevation,
      theme.glassTint,
      theme.glassBlur,
      theme.glassOpacity,
    ].join('|')
  })
  assert.equal(new Set(fingerprint).size, fingerprint.length, 'duas casas com a mesma assinatura de design')

  // E cada eixo do vidro sozinho tem de separar as três: uma casa que só se
  // distingue pela tonalidade tem o mesmo material das outras pintado de outra
  // cor, o que a dois metros de distância é o mesmo material.
  const glassThemes = DEMO_TENANT_IDS.map((id) => ({ ...defaultTheme, ...DEMO_TENANTS[id].theme }))
  for (const [axis, values] of [
    ['tonalidade', glassThemes.map((t) => t.glassTint)],
    ['espessura', glassThemes.map((t) => t.glassBlur)],
    ['cobertura', glassThemes.map((t) => t.glassOpacity)],
  ] as const) {
    assert.equal(new Set(values).size, values.length, `duas casas com a mesma ${axis} de vidro`)
  }

  // Pelo menos uma casa tem de exercitar cada extremo do sistema, senão o token
  // existe sem nunca ter sido pintado — e um token nunca pintado é um token que
  // não funciona, só que ninguém sabe ainda.
  const themes = DEMO_TENANT_IDS.map((id) => ({ ...defaultTheme, ...DEMO_TENANTS[id].theme }))
  assert.ok(themes.some((t) => t.displayCase === 'none'), 'nenhuma casa escreve o título fora da caixa alta')
  // A asserção era `elevation === 'hard'`, e a string perdeu o dono quando a
  // lanchonete deixou de ser vintage: `hard` é o deslocamento sólido de uma
  // coisa IMPRESSA, e nenhuma casa que trabalhe com vidro pode usá-lo sem pedir
  // ao olho que leia "adesivo" e "camada" no mesmo cartão (ver TotemElevation).
  //
  // O que a asserção protege não é a string e sim a ideia: uma casa tem de
  // exercitar a elevação, senão o token existe sem nunca ter sido pintado — e
  // um token nunca pintado é um token que não funciona, só que ninguém sabe
  // ainda. Então ela passa a exigir que alguém SAIA do padrão, qualquer que
  // seja o caminho.
  //
  // Fica a dívida honesta: `hard` e `flat` continuam no enum sem casa nenhuma.
  // Os dois são capacidades reais e documentadas, e a demonstração hoje não
  // pinta nenhum dos dois. Quem for adicionar uma quarta casa deve um deles.
  assert.ok(themes.some((t) => t.elevation !== defaultTheme.elevation),
    'todas as casas usam a elevação padrão — o token não está sendo exercitado por ninguém')
  // A página é o que carrega "outra casa" antes de qualquer texto ser lido,
  // desde que a textura por tenant foi removida por ruído. Ver TotemTheme.
  const pages = themes.map((t) => t.page)
  assert.equal(new Set(pages).size, pages.length, 'duas casas com a mesma cor de página')
  assert.ok(themes.some((t) => t.onAction !== '#FFFFFF'), 'nenhuma casa prova que a tinta do commit é token')
})

for (const id of DEMO_TENANT_IDS) {
  const tenant = DEMO_TENANTS[id]

  test(`${id}: o tema passa no piso de contraste`, () => {
    const theme = { ...defaultTheme, ...tenant.theme }
    // As mesmas três regras de `checkTheme`. Uma marca que reprova aqui é uma
    // tela ilegível às duas da tarde perto da janela.
    //
    // O par medido é ação × ONACTION, não ação × branco. Era branco fixo, e
    // branco fixo reprovava toda marca amarela antes de ela existir — a
    // checagem media um botão que o painel não pinta.
    assert.ok(contrast(theme.action, theme.onAction) >= 4.5, 'ação × tinta do commit')
    // E a marca como TEXTO sobre o cartão, que é onde o preço do prato mora.
    assert.ok(contrast(theme.actionInk ?? theme.action, theme.surface) >= 4.5, 'marca-texto × cartão')
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
