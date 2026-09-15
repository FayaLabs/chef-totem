// Em qual UNIDADE a venda cai.
//
// Cada casa da feira é uma empresa do mesmo tenant. Mandar tudo para a matriz
// junta o Fechamento do Dia das três num número só, e isso não se desfaz
// depois — por isso a regra tem teste, mesmo sendo quatro linhas.
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { unitForHouse, type BeautyplaceCatalog } from '@/orders/beautyplace'

const catalog = (units: BeautyplaceCatalog['units']): BeautyplaceCatalog => ({
  byInternalCode: new Map(),
  units,
  missing: [],
  mismatched: [],
})

const UNITS = [
  { id: 602, name: 'Restaurante PDC', isHeadquarters: true },
  { id: 607, name: 'Pizza House', isHeadquarters: false },
  { id: 608, name: 'Café Sabor', isHeadquarters: false },
  { id: 609, name: 'MaxBurger', isHeadquarters: false },
]

test('a casa no vidro decide a unidade', () => {
  assert.equal(unitForHouse(catalog(UNITS), 'MaxBurger')?.id, 609)
  assert.equal(unitForHouse(catalog(UNITS), 'Pizza House')?.id, 607)
})

test('acento e caixa não separam a casa da unidade dela', () => {
  // O nome vem do documento da casa e a unidade vem do ERP, digitada por outra
  // pessoa. "cafe sabor" e "Café Sabor" são a mesma feira.
  assert.equal(unitForHouse(catalog(UNITS), 'cafe sabor')?.id, 608)
  assert.equal(unitForHouse(catalog(UNITS), 'CAFÉ SABOR')?.id, 608)
})

test('casa sem unidade cai na matriz, e não na recusa da venda', () => {
  // Um pedido na unidade errada se conserta; um pedido perdido na frente do
  // cliente, não.
  assert.equal(unitForHouse(catalog(UNITS), 'Casa que não existe')?.id, 602)
  assert.equal(unitForHouse(catalog(UNITS), null)?.id, 602)
})

test('sem unidade nenhuma, ninguém é escolhido', () => {
  assert.equal(unitForHouse(catalog([]), 'MaxBurger'), null)
})
