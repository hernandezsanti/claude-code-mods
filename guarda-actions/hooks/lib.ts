// Escape explícito: un comando que lleva este comentario pasa sin revisión.
export const OVERRIDE = '# ok-actions'

export type Verdict = { deny: string } | { isPrCreate: boolean }

const WATCH_OR_RERUN = /\bgh\s+run\s+(watch|rerun)\b/
const CHECKS_WATCH = /\bgh\s+pr\s+checks\b[^\n|;&]*--watch\b/
const POLLING_LOOP = /\b(sleep|until|while)\b[\s\S]*\bgh\s+(run\s+(view|list)|pr\s+checks)\b/
const PR_CREATE = /\bgh\s+pr\s+create\b/

const WHY =
  'Cada rerun o espera de CI gasta minutos de GitHub Actions, que en muchas organizaciones son pagos.' +
  'Verifica en local lo mismo que corre el CI (tests, linter, scanners), y haz un solo push por tanda de arreglos. ' +
  `Si de verdad hace falta, agrega ${OVERRIDE} al final del comando.`

export function checkCommand(command: string): Verdict {
  if (command.includes(OVERRIDE)) return { isPrCreate: false }

  if (WATCH_OR_RERUN.test(command) || CHECKS_WATCH.test(command)) {
    return { deny: `guarda-actions: bloqueado gh run watch/rerun y gh pr checks --watch. ${WHY}` }
  }

  if (POLLING_LOOP.test(command)) {
    return {
      deny:
        'guarda-actions: bloqueado el polling de CI con sleep/until/while. ' +
        `Un solo gh pr checks o gh run view puntual está bien; esperar en un loop no. ${WHY}`,
    }
  }

  return { isPrCreate: PR_CREATE.test(command) }
}
