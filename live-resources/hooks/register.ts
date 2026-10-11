import type { Register } from 'claude-code'

import { countRunners, formatStatus, levelOf, parseDfAvailable, parseVmStat } from './lib'
import type { Level } from './lib'

const EVERY_MS = 30_000

export const register: Register = on => {
  let lastLevel: Level = 'ok'

  on('session.start', async ($, e, next) => {
    const started = await next(e)

    if (e.isInteractive) {
      const tick = async () => {
        try {
          const [vm, df, ps] = await Promise.all([
            $.process.run(['vm_stat']),
            $.process.run(['df', '-k', '/']),
            $.process.run(['ps', '-axo', 'command']),
          ])
          const ram = parseVmStat(vm.stdout)
          const disk = parseDfAvailable(df.stdout)

          const level = levelOf(ram, disk)

          // The status line only shows up when there is a problem: the engine
          // draws it as a warning, and showing it all the time would be noise.
          $.ui.status(level === 'ok' ? undefined : formatStatus(ram, disk, countRunners(ps.stdout)))

          if (level !== 'ok' && level !== lastLevel) {
            $.ui.toast(
              level === 'critical'
                ? 'Memory or disk almost full: do not start more tests in parallel'
                : 'Low memory or disk: be careful with tests in parallel',
            )
          }
          lastLevel = level
        } catch {
          // A failed tick must not break the session; the next one tries again.
        }
      }

      void tick()
      $.clock.every(EVERY_MS, tick)
    }

    return started
  })
}
