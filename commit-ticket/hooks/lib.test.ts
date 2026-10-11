import { expect, test } from 'claude-code/testing'

import { checkCommit, extractMessage, OVERRIDE, ticketOf } from './lib'

test('ticketOf reads the ticket from the branch', () => {
  expect(ticketOf('feature/ABC-5-something')).toBe('ABC-5')
  expect(ticketOf('fix/XYZ-981-reading')).toBe('XYZ-981')
  expect(ticketOf('feature/Q12-202-flow')).toBe('Q12-202')
  expect(ticketOf('ABC-6-scenario-editor')).toBe('ABC-6')
  expect(ticketOf('main')).toBe(null)
  expect(ticketOf('fix/hover-order-title')).toBe(null)
})

test('extractMessage reads -m with double quotes, single quotes and heredoc', () => {
  expect(extractMessage('git commit -m "[ABC-5] Something"')).toBe('[ABC-5] Something')
  expect(extractMessage("git commit -am 'Fix something'")).toBe('Fix something')
  expect(extractMessage(`git commit -m "$(cat <<'EOF'\n[ABC-5] From a heredoc\n\nbody\nEOF\n)"`)).toBe(
    '[ABC-5] From a heredoc',
  )
})

test('extractMessage does not guess when it cannot read the message', () => {
  expect(extractMessage('git commit --amend --no-edit')).toBe(null)
  expect(extractMessage('git commit -F msg.txt')).toBe(null)
  expect(extractMessage('git commit -m "$(git log -1 --format=%s)"')).toBe(null)
  expect(extractMessage('git status')).toBe(null)
})

test('blocks a commit without a ticket on a branch with a ticket and suggests the message', () => {
  const reason = checkCommit('git commit -m "Fix overflow"', 'feature/ABC-5-something')
  expect(reason).toContain('[ABC-5] Fix overflow')
})

test('allows commits with a ticket, or on branches without a ticket', () => {
  expect(checkCommit('git commit -m "[ABC-5] Something"', 'feature/ABC-5-something')).toBe(null)
  expect(checkCommit('git commit -m "[Q12-9] Another ticket"', 'feature/ABC-5-something')).toBe(null)
  expect(checkCommit('git commit -m "Fix overflow"', 'fix/hover-order-title')).toBe(null)
  expect(checkCommit('git commit -m "fix(reports): something"', 'main')).toBe(null)
})

test('allows merges and messages it cannot read', () => {
  expect(checkCommit("git commit -m 'Merge branch x'", 'feature/ABC-5-something')).toBe(null)
  expect(checkCommit('git commit --amend --no-edit', 'feature/ABC-5-something')).toBe(null)
})

test('blocks commits that only fix linting or formatting', () => {
  expect(checkCommit('git commit -m "[ABC-5] Fix linting"', 'feature/ABC-5-something')).toContain('linting or formatting')
  expect(checkCommit('git commit -m "[ABC-5] Run prettier"', 'feature/ABC-5-something')).toContain('linting or formatting')
  expect(checkCommit('git commit -m "[ABC-5] Add date format validation"', 'feature/ABC-5-something')).toBe(null)
})

test('also recognizes linting commits written in Spanish', () => {
  expect(checkCommit('git commit -m "[ABC-5] Corregir linting"', 'feature/ABC-5-something')).toContain('linting or formatting')
  expect(checkCommit('git commit -m "[ABC-5] Aplicar formato Prettier"', 'feature/ABC-5-something')).toContain('linting or formatting')
})

test('ignores heredocs that are not part of the commit (real cases)', () => {
  const branch = 'feature/DOC-2-work-plan'
  // A plan with "git commit" steps inside, written with cat and with no real commit.
  const plan = "cat >> docs/plan.md <<'EOF'\n### Task 3: Snapshot\n- [ ] git commit -m \"wip\"\nEOF"
  expect(extractMessage(plan)).toBe(null)
  // An earlier heredoc and then the real commit with its -m.
  const both = `cat > a.md <<'EOF'\n### Task 3\nEOF\ngit add a.md && git commit -m "[DOC-2] Add the plan"`
  expect(extractMessage(both)).toBe('[DOC-2] Add the plan')
  expect(checkCommit(both, branch)).toBe(null)
  // A python script that mentions git commit in its text.
  const py = "python3 - <<'EOF'\np='README.md'; s=open(p).read()\n# then git commit\nEOF"
  expect(checkCommit(py, branch)).toBe(null)
})

test('reads the heredoc of the commit even when there is another one before it', () => {
  const cmd = `cat > x <<'A'\nhello\nA\ngit commit -F - <<'EOF'\n[XYZ-990] Update dependencies\n\nbody\nEOF`
  expect(extractMessage(cmd)).toBe('[XYZ-990] Update dependencies')
})

test('a ; or | inside the quotes of -m does not cut the message', () => {
  expect(extractMessage('git commit -m "Fix a; b | c" && git push')).toBe('Fix a; b | c')
  expect(extractMessage('git commit -q && echo -m "not the message"')).toBe(null)
})

test('the ok-commit comment is the escape hatch', () => {
  expect(checkCommit(`git commit -m "WIP" ${OVERRIDE}`, 'feature/ABC-5-something')).toBe(null)
})
