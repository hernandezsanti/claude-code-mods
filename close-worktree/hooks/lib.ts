export const PR_CREATE = /\bgh\s+pr\s+create\b/

// Directory where the command runs: the first `cd X` or the `git -C X`.
// If there is none, the command runs in the session directory.
export function commandDir(command: string, home: string): string | null {
  const raw =
    /^\s*cd\s+("[^"]+"|'[^']+'|[^\s&;]+)/m.exec(command)?.[1] ??
    /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(command)?.[1]
  if (!raw) return null
  const dir = raw.replace(/^["']|["']$/g, '')
  return dir.startsWith('~') ? home + dir.slice(1) : dir
}

export type Probe = {
  isWorktree: boolean
  root: string
  mainRepo: string
  dirtyFiles: number
  unpushed: number | null
}

// Output of `git rev-parse --git-dir --git-common-dir --show-toplevel`.
export function parseLayout(revParse: string): { isWorktree: boolean; root: string; mainRepo: string } {
  const [gitDir = '', common = '', root = ''] = revParse.trim().split('\n').map(s => s.trim())
  const absolute = (p: string): string => (p.startsWith('/') ? p : `${root}/${p}`)
  const isWorktree = Boolean(gitDir && common) && absolute(gitDir) !== absolute(common)
  return { isWorktree, root, mainRepo: absolute(common).replace(/\/\.git\/?$/, '') }
}

export function advice(probe: Probe): string | null {
  if (!probe.isWorktree) return null

  const pending: string[] = []
  if (probe.dirtyFiles > 0) pending.push(`${probe.dirtyFiles} uncommitted files`)
  if (probe.unpushed === null) pending.push('unpushed commits (the branch has no upstream)')
  else if (probe.unpushed > 0) pending.push(`${probe.unpushed} unpushed commits`)

  if (pending.length > 0) {
    return (
      `close-worktree: the PR was opened from the worktree ${probe.root}, but it still has ${pending.join(' and ')}. ` +
      'Do not remove it: fix that first and tell the user.'
    )
  }

  return (
    `close-worktree: the PR was opened from the worktree ${probe.root} and it is clean and pushed. ` +
    `Remove it now with \`git -C ${probe.mainRepo} worktree remove ${probe.root}\` ` +
    '(the local and remote branches stay; if the review asks for changes, create it again with `git worktree add`).'
  )
}
