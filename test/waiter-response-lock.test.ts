// The waiter used to go haywire mid-order, and this is the reason.
//
// "Conversation already has an active response in progress: resp_X" is the
// server telling us a response is already running. The handler treated it as a
// failure: it cleared the lock — the opposite of what the message says — so the
// next screen announcement passed the gate and sent another `response.create`,
// which failed the same way, for as long as the screen kept moving. It also
// dropped the queued announcement, so the waiter went quiet on a turn it owed
// an answer for, and told the customer to tap the orb over a race that never
// touched the microphone.
import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  isResponseAliveEvent,
  isResponseBusyError,
  responseIdFrom,
} from '@/waiter/realtime-transport'

const BUSY =
  'Conversation already has an active response in progress: resp_EMMZVTdEG8LkNggF6NVB7. ' +
  'Wait until the response is finished before creating a new one.'

test('the duplicate-response race is not a failure', () => {
  assert.equal(isResponseBusyError(BUSY), true)
})

test('a real error is still an error', () => {
  assert.equal(isResponseBusyError('The server had an error while processing your request.'), false)
  assert.equal(isResponseBusyError('Invalid value for session.audio.input.turn_detection.'), false)
  assert.equal(isResponseBusyError(''), false)
})

test('the live response id is read from the message, to restore the lock', () => {
  assert.equal(responseIdFrom(BUSY), 'resp_EMMZVTdEG8LkNggF6NVB7')
})

test('with no id in the message the lock still holds on its own', () => {
  assert.equal(responseIdFrom('no id here'), null)
})

// The second cause of the same symptom. The response lock's watchdog measured
// total elapsed time, so a long-but-healthy response — a four-round tool chain
// narrating as it goes — could outlive it. The timer then cleared the lock
// under a live response and the next announcement hit the same busy error.
// Measuring silence instead of duration means it only fires when the server has
// actually stopped talking.

test('response traffic proves the response is still alive', () => {
  for (const type of [
    'response.created',
    'response.output_audio_transcript.delta',
    'response.output_item.added',
    'response.function_call_arguments.done',
    'output_audio_buffer.started',
    'output_audio_buffer.stopped',
  ]) {
    assert.equal(isResponseAliveEvent(type), true, type)
  }
})

test('room noise cannot keep a dead lock alive', () => {
  // Input-side events fire constantly in a busy room. If they re-armed the
  // watchdog, a lock stranded by a lost `response.done` would never expire.
  for (const type of [
    'input_audio_buffer.speech_started',
    'input_audio_buffer.speech_stopped',
    'input_audio_buffer.committed',
    'conversation.item.input_audio_transcription.delta',
    'session.updated',
    'error',
  ]) {
    assert.equal(isResponseAliveEvent(type), false, type)
  }
})
