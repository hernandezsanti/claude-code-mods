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
          `You opened ${prsCreated} PRs in this session: each one runs CI. One integration PR is better.`,
          { timeoutMs: 10_000 },
        )
      }
    }

    return ran
  })
}
