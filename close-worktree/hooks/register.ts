import type { EngineInterface, Register } from 'claude-code'

import { advice, commandDir, parseLayout, PR_CREATE } from './lib'
import type { Probe } from './lib'

async function probe($: EngineInterface, cwd: string): Promise<Probe | null> {
  const run = (argv: string[]) => $.process.run(argv, { cwd, timeoutMs: 10_000 })

  // Absolute paths: in a subdirectory, git-dir is absolute but git-common-dir is relative.
  const layout = await run([
    'git',
    'rev-parse',
    '--path-format=absolute',
    '--git-dir',
    '--git-common-dir',
    '--show-toplevel',
  ])
  if (layout.exitCode !== 0) return null

  const [status, ahead] = await Promise.all([
    run(['git', 'status', '--porcelain']),
    run(['git', 'rev-list', '--count', '@{u}..HEAD']),
  ])

  return {
    ...parseLayout(layout.stdout),
    dirtyFiles: status.stdout.split('\n').filter(Boolean).length,
    unpushed: ahead.exitCode === 0 ? Number(ahead.stdout.trim()) : null,
  }
}

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    if (!PR_CREATE.test(e.command) || ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    try {
      const home = (await $.env.get('HOME')) ?? ''
      const cwd = commandDir(e.command, home) ?? (await $.session.cwd())
      const found = await probe($, cwd)
      const message = found && advice(found)

      if (message) {
        $.ui.toast('PR opened from a worktree: check if it can be closed now', { timeoutMs: 8_000 })
        return { ...ran, context: [...(ran.context ?? []), message] }
      }
    } catch {
      // If the worktree could not be checked, the PR is already open: do not get in the way.
    }

    return ran
  })
}
