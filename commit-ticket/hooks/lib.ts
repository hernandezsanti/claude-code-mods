// Escape explícito: un comando con este comentario pasa sin revisión.
export const OVERRIDE = '# ok-commit'

export const IS_COMMIT = /\bgit\s+(?:-[Cc]\s+\S+\s+)*commit\b/

const HEREDOC_START = /<<-?\s*\\?['"]?(\w+)['"]?/
const INLINE = /\s(?:-[a-zA-Z]*m|--message)[ =]\s*(?:"([^"]*)"|'([^']*)')/
// Caracteres que cierran el segmento del `git commit` en un comando compuesto
// (`&&`, `||`, `;`, `|`, `&` y salto de línea).
const SEGMENT_END = ';&|\n'

// Separa los cuerpos de los heredocs del resto del comando. Sin esto, un
// `cat >> plan.md <<'EOF'` o un `python3 - <<'EOF'` que mencionan `git commit`
// en su texto se leían como el commit, y su primera línea como el mensaje.
function splitHeredocs(command: string): { outside: string; bodies: string[] } {
  const lines = command.split('\n')
  const outside: string[] = []
  const bodies: string[] = []
  for (let i = 0; i < lines.length; i++) {
    outside.push(lines[i])
    const start = HEREDOC_START.exec(lines[i])
    if (!start) continue
    const body: string[] = []
    for (i++; i < lines.length && lines[i].trim() !== start[1]; i++) body.push(lines[i])
    bodies.push(body.join('\n'))
    outside.push(`<<HEREDOC_${bodies.length - 1}`)
  }
  return { outside: outside.join('\n'), bodies }
}

// Primera línea del mensaje de un `git commit`, o null cuando no se puede leer
// con seguridad (`-F`, `--amend --no-edit`, `$(git log ...)`, variables).
export function extractMessage(command: string): string | null {
  const { outside, bodies } = splitHeredocs(command)
  const commit = IS_COMMIT.exec(outside)
  if (!commit) return null

  // Solo cuenta lo que va desde `git commit` hasta el fin de su segmento,
  // más un heredoc que arranque ahí (`-F - <<EOF` o `-m "$(cat <<EOF`).
  const rest = outside.slice(commit.index + commit[0].length)
  const heredocRef = /^[^\n]*?<<-?\s*\\?['"]?\w+['"]?[^\n]*\n<<HEREDOC_(\d+)/.exec(rest)
  if (heredocRef) {
    const first = bodies[Number(heredocRef[1])].split('\n').find((l) => l.trim() !== '')
    return clean(first)
  }

  const inline = INLINE.exec(firstSegment(rest))
  return clean(inline?.[1] ?? inline?.[2])
}

// Corta en el primer `&&`, `||`, `;`, `|` o salto de línea fuera de comillas.
function firstSegment(text: string): string {
  let quote: string | null = null
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (SEGMENT_END.includes(c)) {
      return text.slice(0, i)
    }
  }
  return text
}

function clean(raw: string | undefined): string | null {
  const message = raw?.trim()
  if (!message || message.includes('$(') || message.startsWith('$')) return null
  return message
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
