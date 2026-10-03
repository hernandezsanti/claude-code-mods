import { expect, test } from 'claude-code/testing'

import { checkCommit, extractMessage, OVERRIDE, ticketOf } from './lib'

test('ticketOf lee el ticket de la rama', () => {
  expect(ticketOf('feature/ABC-5-algo')).toBe('ABC-5')
  expect(ticketOf('fix/XYZ-981-lectura')).toBe('XYZ-981')
  expect(ticketOf('feature/Q12-202-flujo')).toBe('Q12-202')
  expect(ticketOf('ABC-6-scenario-editor')).toBe('ABC-6')
  expect(ticketOf('main')).toBe(null)
  expect(ticketOf('fix/hover-titulo-pedido')).toBe(null)
})

test('extractMessage lee -m con comillas dobles, simples y heredoc', () => {
  expect(extractMessage('git commit -m "[ABC-5] algo"')).toBe('[ABC-5] algo')
  expect(extractMessage("git commit -am 'Fix algo'")).toBe('Fix algo')
  expect(extractMessage(`git commit -m "$(cat <<'EOF'\n[ABC-5] desde heredoc\n\ncuerpo\nEOF\n)"`)).toBe(
    '[ABC-5] desde heredoc',
  )
})

test('extractMessage no adivina cuando no puede leer el mensaje', () => {
  expect(extractMessage('git commit --amend --no-edit')).toBe(null)
  expect(extractMessage('git commit -F msg.txt')).toBe(null)
  expect(extractMessage('git commit -m "$(git log -1 --format=%s)"')).toBe(null)
  expect(extractMessage('git status')).toBe(null)
})

test('bloquea un commit sin ticket en una rama con ticket y sugiere el mensaje', () => {
  const reason = checkCommit('git commit -m "Fix overflow"', 'feature/ABC-5-algo')
  expect(reason).toContain('[ABC-5] Fix overflow')
})

test('deja pasar commits con ticket, o en ramas sin ticket', () => {
  expect(checkCommit('git commit -m "[ABC-5] algo"', 'feature/ABC-5-algo')).toBe(null)
  expect(checkCommit('git commit -m "[Q12-9] otro ticket"', 'feature/ABC-5-algo')).toBe(null)
  expect(checkCommit('git commit -m "Fix overflow"', 'fix/hover-titulo-pedido')).toBe(null)
  expect(checkCommit('git commit -m "fix(reports): algo"', 'main')).toBe(null)
})

test('deja pasar merges y mensajes ilegibles', () => {
  expect(checkCommit("git commit -m 'Merge branch x'", 'feature/ABC-5-algo')).toBe(null)
  expect(checkCommit('git commit --amend --no-edit', 'feature/ABC-5-algo')).toBe(null)
})

test('bloquea commits solo de linting o formato', () => {
  expect(checkCommit('git commit -m "[ABC-5] Corregir linting"', 'feature/ABC-5-algo')).toContain('linting o formato')
  expect(checkCommit('git commit -m "[ABC-5] Aplicar formato Prettier"', 'feature/ABC-5-algo')).toContain('linting o formato')
  expect(checkCommit('git commit -m "[ABC-5] Agregar validación de formato de fecha"', 'feature/ABC-5-algo')).toBe(null)
})

test('el comentario ok-commit es la salida de emergencia', () => {
  expect(checkCommit(`git commit -m "WIP" ${OVERRIDE}`, 'feature/ABC-5-algo')).toBe(null)
})
