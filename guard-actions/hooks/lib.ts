// Explicit escape hatch: a command that has this comment passes without a check.
export const OVERRIDE = '# ok-actions'

export type Verdict = { deny: string } | { isPrCreate: boolean }

const WATCH_OR_RERUN = /\bgh\s+run\s+(watch|rerun)\b/
const CHECKS_WATCH = /\bgh\s+pr\s+checks\b[^\n|;&]*--watch\b/
const PR_CREATE = /\bgh\s+pr\s+create\b/

const WHY =
  'Every rerun or wait for CI uses GitHub Actions minutes, and many organizations pay for them. ' +
  'Run locally the same checks that CI runs (tests, linter, scanners), and push only once for each batch of fixes. ' +
  `If you really need it, add ${OVERRIDE} at the end of the command.`

export function checkCommand(command: string): Verdict {
  if (command.includes(OVERRIDE)) return { isPrCreate: false }

  if (WATCH_OR_RERUN.test(command) || CHECKS_WATCH.test(command)) {
    return { deny: `guard-actions: blocked gh run watch/rerun and gh pr checks --watch. ${WHY}` }
  }

  return { isPrCreate: PR_CREATE.test(command) }
}
