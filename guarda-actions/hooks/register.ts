import type { Register } from 'claude-code'

import { checkCommand } from './lib'

export const register: Register = on => {
  let prsCreated = 0

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const verdict = checkCommand(e.command)

    if ('deny' in verdict) {
      return { deny: verdict.deny }
    }

    const ran = await next(e)

    if (verdict.isPrCreate && ran.deny === undefined && ran.isError !== true) {
      prsCreated += 1
      if (prsCreated >= 2) {
        $.ui.toast(
          `Ya abriste ${prsCreated} PRs en esta sesión: cada uno corre el CI. Mejor un PR de integración.`,
          { timeoutMs: 10_000 },
        )
      }
    }

    return ran
  })
}
