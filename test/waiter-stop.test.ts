// O botão que PARA. Ele existe porque não existia: enquanto o garçom conectava,
// pensava ou falava, o controle ficava desabilitado, e a única forma de calar
// uma sessão que começou a dizer bobagem era fechar a aplicação — na frente da
// fila. Aqui a regra é testada sem navegador, que é onde ela mora.
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { isWaiterBusy, talkAction } from '@/waiter/useWaiter'

test('desligado não tem toque nenhum', () => {
  assert.equal(talkAction('off'), null)
})

test('parado, o toque começa a falar', () => {
  assert.equal(talkAction('idle'), 'start')
  assert.equal(talkAction('error'), 'start')
})

test('ouvindo, o toque fecha o microfone', () => {
  assert.equal(talkAction('listening'), 'stop-listening')
})

test('conectando, pensando ou falando, o toque DERRUBA a sessão', () => {
  // Fechar o microfone não cala uma resposta que já está tocando: por isso
  // estas três fases terminam a sessão, e não a escuta.
  assert.equal(talkAction('connecting'), 'end')
  assert.equal(talkAction('thinking'), 'end')
  assert.equal(talkAction('speaking'), 'end')
})

test('conectar é uma fase ocupada, e não a mesma coisa que pensar', () => {
  assert.ok(isWaiterBusy('connecting'))
  assert.ok(isWaiterBusy('thinking'))
  assert.equal(isWaiterBusy('idle'), false)
  assert.notEqual(talkAction('connecting'), talkAction('idle'))
})
