import { expect, test } from 'claude-code/testing'

import { advice, commandDir, parseLayout, PR_CREATE } from './lib'

test('reconoce gh pr create', () => {
  expect(PR_CREATE.test('cd x && gh pr create --base dev')).toBe(true)
  expect(PR_CREATE.test('gh pr edit 3')).toBe(false)
})

test('commandDir toma el cd o el git -C y expande ~', () => {
  expect(commandDir('cd ~/worktrees/app/ABC-5 && gh pr create', '/home/u')).toBe('/home/u/worktrees/app/ABC-5')
  expect(commandDir('cd "/a b" && gh pr create', '/h')).toBe('/a b')
  expect(commandDir('git -C /r/wt push && gh pr create', '/h')).toBe('/r/wt')
  expect(commandDir('gh pr create', '/h')).toBe(null)
})

test('parseLayout distingue worktree enlazado y da el repo principal', () => {
  expect(parseLayout('/r/.git/worktrees/w\n/r/.git\n/wt/w\n')).toEqual({
    isWorktree: true,
    root: '/wt/w',
    mainRepo: '/r',
  })
  expect(parseLayout('.git\n.git\n/r\n').isWorktree).toBe(false)
})

const probe = { isWorktree: true, root: '/wt/w', mainRepo: '/r', dirtyFiles: 0, unpushed: 0 }

test('advice manda cerrar el worktree limpio y pusheado', () => {
  expect(advice(probe)).toContain('git -C /r worktree remove /wt/w')
})

test('advice frena el cierre si queda algo sin guardar', () => {
  expect(advice({ ...probe, dirtyFiles: 2 })).toContain('2 archivos sin commitear')
  expect(advice({ ...probe, unpushed: 3 })).toContain('3 commits sin pushear')
  expect(advice({ ...probe, unpushed: null })).toContain('no tiene upstream')
  expect(advice({ ...probe, dirtyFiles: 1 })).not.toContain('worktree remove')
})

test('advice no dice nada fuera de un worktree', () => {
  expect(advice({ ...probe, isWorktree: false })).toBe(null)
})
