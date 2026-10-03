import { expect, test } from 'claude-code/testing'

import { checkCommand, OVERRIDE } from './lib'

const denied = (command: string): boolean => 'deny' in checkCommand(command)

test('bloquea gh run watch y gh run rerun', () => {
  expect(denied('gh run watch 123')).toBe(true)
  expect(denied('cd repo && gh run rerun 123 --failed')).toBe(true)
})

test('bloquea gh pr checks --watch pero no gh pr checks a secas', () => {
  expect(denied('gh pr checks 34 --watch')).toBe(true)
  expect(denied('gh pr checks 34')).toBe(false)
})

test('bloquea el polling de CI con sleep', () => {
  expect(denied('sleep 60; gh run list --limit 1')).toBe(true)
  expect(denied('until gh pr checks 5 | grep -q pass; do sleep 30; done')).toBe(true)
})

test('deja pasar consultas puntuales', () => {
  expect(denied('gh run view 123 --log-failed')).toBe(false)
  expect(denied('gh run list --limit 3')).toBe(false)
  expect(denied('gh pr view 12')).toBe(false)
})

test('el comentario ok-actions es la salida de emergencia', () => {
  expect(denied(`gh run rerun 123 ${OVERRIDE}`)).toBe(false)
})

test('reconoce gh pr create', () => {
  expect(checkCommand('gh pr create --base dev --title x')).toEqual({ isPrCreate: true })
  expect(checkCommand('gh pr edit 3')).toEqual({ isPrCreate: false })
})
