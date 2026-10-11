import { expect, test } from 'claude-code/testing'

import { checkCommand, OVERRIDE } from './lib'

const denied = (command: string): boolean => 'deny' in checkCommand(command)

test('blocks gh run watch and gh run rerun', () => {
  expect(denied('gh run watch 123')).toBe(true)
  expect(denied('cd repo && gh run rerun 123 --failed')).toBe(true)
})

test('blocks gh pr checks --watch but not plain gh pr checks', () => {
  expect(denied('gh pr checks 34 --watch')).toBe(true)
  expect(denied('gh pr checks 34')).toBe(false)
})

test('allows read-only polling: checking the status uses no minutes', () => {
  expect(denied('sleep 60; gh run list --limit 1')).toBe(false)
  expect(denied('until gh pr checks 5 | grep -q pass; do sleep 30; done')).toBe(false)
})

test('polling does not hide a rerun or a watch inside the same command', () => {
  expect(denied('sleep 60; gh run rerun 123')).toBe(true)
  expect(denied('while true; do gh pr checks 5 --watch; done')).toBe(true)
})

test('allows one-off queries', () => {
  expect(denied('gh run view 123 --log-failed')).toBe(false)
  expect(denied('gh run list --limit 3')).toBe(false)
  expect(denied('gh pr view 12')).toBe(false)
})

test('the ok-actions comment is the escape hatch', () => {
  expect(denied(`gh run rerun 123 ${OVERRIDE}`)).toBe(false)
})

test('recognizes gh pr create', () => {
  expect(checkCommand('gh pr create --base dev --title x')).toEqual({ isPrCreate: true })
  expect(checkCommand('gh pr edit 3')).toEqual({ isPrCreate: false })
})
