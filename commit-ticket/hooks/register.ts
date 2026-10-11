import type { Register } from 'claude-code'

import { checkCommit, extractMessage } from './lib'

// Directory where the command runs: the first `cd X` or the `git -C X`.
function commandDir(command: string, home: string): string | null {
  const raw =
    /^\s*cd\s+("[^"]+"|'[^']+'|[^\s&;]+)/m.exec(command)?.[1] ??
    /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(command)?.[1]
  if (!raw) return null
  const dir = raw.replace(/^["']|["']$/g, '')
  return dir.startsWith('~') ? home + dir.slice(1) : dir
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (extractMessage(e.command) === null) {
      return next(e)
    }

    try {
      const home = (await $.env.get('HOME')) ?? ''
      const cwd = commandDir(e.command, home) ?? (await $.session.cwd())
      const branch = await $.process.run(['git', 'branch', '--show-current'], {
        cwd,
        timeoutMs: 10_000,
      })
      const reason = checkCommit(e.command, branch.stdout.trim())

      if (reason !== null) {
        return { deny: reason }
      }
    } catch {
      // If the branch could not be read, it is better to let the commit pass than to block it.
    }

    return next(e)
  })
}
