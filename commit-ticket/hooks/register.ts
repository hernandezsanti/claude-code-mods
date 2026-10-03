import type { Register } from 'claude-code'

import { checkCommit, extractMessage } from './lib'

// Directorio donde corre el comando: el primer `cd X` o el `git -C X`.
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
      // Si no se pudo leer la rama, mejor dejar pasar el commit que trabarlo.
    }

    return next(e)
  })
}
