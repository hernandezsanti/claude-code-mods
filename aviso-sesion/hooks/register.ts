import type { Register } from 'claude-code'

import { soundFor } from './lib'

export const register: Register = on => {
  let isInteractive = false

  on('session.start', async ($, e, next) => {
    isInteractive = e.isInteractive
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const sound = isInteractive ? soundFor(e) : null

    if (sound !== null) {
      // afplay solo existe en macOS; si falla, no pasa nada.
      void $.process.run(['afplay', sound]).catch(() => undefined)
    }

    return next(e)
  })
}
