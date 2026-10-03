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

          // La línea de estado solo aparece cuando hay un problema: el motor la
          // dibuja como aviso, y fija todo el tiempo sería ruido.
          $.ui.status(level === 'ok' ? undefined : formatStatus(ram, disk, countRunners(ps.stdout)))

          if (level !== 'ok' && level !== lastLevel) {
            $.ui.toast(
              level === 'critical'
                ? 'Memoria o disco casi agotados: no lances más tests en paralelo'
                : 'Poca memoria o disco: cuidado con los tests en paralelo',
            )
          }
          lastLevel = level
        } catch {
          // Un tick fallido no debe tumbar la sesión; el siguiente reintenta.
        }
      }

      void tick()
      $.clock.every(EVERY_MS, tick)
    }

    return started
  })
}
