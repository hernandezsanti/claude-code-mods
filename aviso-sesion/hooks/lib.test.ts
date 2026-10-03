import { expect, test } from 'claude-code/testing'

import { soundFor } from './lib'

const turn = { durationMs: 45_000, isAborted: false, answer: 'Listo.' }

test('un turno largo que terminó suena Glass', () => {
  expect(soundFor(turn)).toBe('/System/Library/Sounds/Glass.aiff')
})

test('un turno que termina en pregunta suena Ping', () => {
  expect(soundFor({ ...turn, answer: '¿Sigo con el siguiente?\n' })).toBe(
    '/System/Library/Sounds/Ping.aiff',
  )
})

test('un turno corto no suena', () => {
  expect(soundFor({ ...turn, durationMs: 5_000 })).toBe(null)
})

test('un turno interrumpido o de subagente no suena', () => {
  expect(soundFor({ ...turn, isAborted: true })).toBe(null)
  expect(soundFor({ ...turn, agentId: 'sub-1' })).toBe(null)
})
