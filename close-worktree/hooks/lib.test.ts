import { expect, test } from 'claude-code/testing'

import { advice, commandDir, parseLayout, PR_CREATE } from './lib'

test('recognizes gh pr create', () => {
  expect(PR_CREATE.test('cd x && gh pr create --base dev')).toBe(true)
  expect(PR_CREATE.test('gh pr edit 3')).toBe(false)
})

test('commandDir takes the cd or the git -C and expands ~', () => {
  expect(commandDir('cd ~/worktrees/app/ABC-5 && gh pr create', '/home/u')).toBe('/home/u/worktrees/app/ABC-5')
  expect(commandDir('cd "/a b" && gh pr create', '/h')).toBe('/a b')
  expect(commandDir('git -C /r/wt push && gh pr create', '/h')).toBe('/r/wt')
  expect(commandDir('gh pr create', '/h')).toBe(null)
})

test('parseLayout detects a linked worktree and returns the main repo', () => {
  expect(parseLayout('/r/.git/worktrees/w\n/r/.git\n/wt/w\n')).toEqual({
    isWorktree: true,
    root: '/wt/w',
    mainRepo: '/r',
  })
  expect(parseLayout('.git\n.git\n/r\n').isWorktree).toBe(false)
})

const probe = { isWorktree: true, root: '/wt/w', mainRepo: '/r', dirtyFiles: 0, unpushed: 0 }

test('advice says to remove a clean and pushed worktree', () => {
  expect(advice(probe)).toContain('git -C /r worktree remove /wt/w')
})

test('advice stops the removal if something is not saved', () => {
  expect(advice({ ...probe, dirtyFiles: 2 })).toContain('2 uncommitted files')
  expect(advice({ ...probe, unpushed: 3 })).toContain('3 unpushed commits')
  expect(advice({ ...probe, unpushed: null })).toContain('has no upstream')
  expect(advice({ ...probe, dirtyFiles: 1 })).not.toContain('worktree remove')
})

test('advice says nothing outside a worktree', () => {
  expect(advice({ ...probe, isWorktree: false })).toBe(null)
})
