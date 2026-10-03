// Escape explícito: un comando con este comentario pasa sin revisión.
export const OVERRIDE = '# ok-commit'

export const IS_COMMIT = /\bgit\s+(?:-[Cc]\s+\S+\s+)*commit\b/

const HEREDOC = /<<-?\s*\\?['"]?(\w+)['"]?[^\n]*\n\s*([^\n]+)/
const INLINE = /\s(?:-[a-zA-Z]*m|--message)[ =]\s*(?:"([^"]*)"|'([^']*)')/

// Primera línea del mensaje de un `git commit`, o null cuando no se puede leer
// con seguridad (`-F`, `--amend --no-edit`, `$(git log ...)`, variables).
export function extractMessage(command: string): string | null {
  if (!IS_COMMIT.test(command)) return null

  const heredoc = HEREDOC.exec(command)
  const inline = INLINE.exec(command)
  // `-m "$(cat <<'EOF'` también calza INLINE, pero ahí manda el heredoc.
  const raw = (heredoc ? heredoc[2] : (inline?.[1] ?? inline?.[2]))?.trim()

  if (!raw || raw.includes('$(') || raw.startsWith('$')) return null
  return raw
}

// Ticket de una rama como `feature/ABC-5-algo`, `fix/XYZ-981-x` o `ABC-6-editor`.
export function ticketOf(branch: string): string | null {
  return /(?:^|\/)([A-Z][A-Z0-9]*-\d+)(?:-|$)/.exec(branch)?.[1] ?? null
}

const HAS_TICKET = /^\[[A-Z][A-Z0-9]*-\d+\] \S/
const LINT_ONLY =
  /^\[[A-Z][A-Z0-9]*-\d+\]\s+(corregir|aplicar|arreglar|fix|apply|run)\s+(el\s+|los\s+|the\s+)?(linting|lint|formato|format|prettier|eslint)\b/i

// Devuelve el motivo del bloqueo, o null si el commit está bien.
export function checkCommit(command: string, branch: string): string | null {
  if (command.includes(OVERRIDE)) return null

  const message = extractMessage(command)
  if (message === null || /^Merge\b/.test(message)) return null

  const ticket = ticketOf(branch)

  if (ticket !== null && !HAS_TICKET.test(message)) {
    return (
      `commit-ticket: la rama ${branch} lleva el ticket ${ticket}, así que el mensaje debe ser ` +
      `"[TICKET] descripción". Usa: [${ticket}] ${message}`
    )
  }

  if (LINT_ONLY.test(message)) {
    return (
      'commit-ticket: nada de commits solo de linting o formato. Corre el autofix (eslint --fix, prettier --write) ' +
      'y deja el resultado dentro del commit del cambio que lo provocó (git commit --amend o un fixup).'
    )
  }

  return null
}
