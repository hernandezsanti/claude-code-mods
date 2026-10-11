// Explicit escape hatch: a command with this comment passes without a check.
export const OVERRIDE = '# ok-commit'

export const IS_COMMIT = /\bgit\s+(?:-[Cc]\s+\S+\s+)*commit\b/

const HEREDOC_START = /<<-?\s*\\?['"]?(\w+)['"]?/
const INLINE = /\s(?:-[a-zA-Z]*m|--message)[ =]\s*(?:"([^"]*)"|'([^']*)')/
// Characters that end the `git commit` segment in a compound command
// (`&&`, `||`, `;`, `|`, `&` and newline).
const SEGMENT_END = ';&|\n'

// Separates the heredoc bodies from the rest of the command. Without this, a
// `cat >> plan.md <<'EOF'` or a `python3 - <<'EOF'` that mention `git commit`
// in their text were read as the commit, and their first line as the message.
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

// First line of the message of a `git commit`, or null when it cannot be read
// with confidence (`-F`, `--amend --no-edit`, `$(git log ...)`, variables).
export function extractMessage(command: string): string | null {
  const { outside, bodies } = splitHeredocs(command)
  const commit = IS_COMMIT.exec(outside)
  if (!commit) return null

  // Only what goes from `git commit` to the end of its segment counts,
  // plus a heredoc that starts there (`-F - <<EOF` or `-m "$(cat <<EOF`).
  const rest = outside.slice(commit.index + commit[0].length)
  const heredocRef = /^[^\n]*?<<-?\s*\\?['"]?\w+['"]?[^\n]*\n<<HEREDOC_(\d+)/.exec(rest)
  if (heredocRef) {
    const first = bodies[Number(heredocRef[1])].split('\n').find((l) => l.trim() !== '')
    return clean(first)
  }

  const inline = INLINE.exec(firstSegment(rest))
  return clean(inline?.[1] ?? inline?.[2])
}

// Cuts at the first `&&`, `||`, `;`, `|` or newline outside quotes.
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

// Ticket of a branch like `feature/ABC-5-something`, `fix/XYZ-981-x` or `ABC-6-editor`.
export function ticketOf(branch: string): string | null {
  return /(?:^|\/)([A-Z][A-Z0-9]*-\d+)(?:-|$)/.exec(branch)?.[1] ?? null
}

const HAS_TICKET = /^\[[A-Z][A-Z0-9]*-\d+\] \S/
// Recognizes English and Spanish verbs and nouns.
const LINT_ONLY =
  /^\[[A-Z][A-Z0-9]*-\d+\]\s+(corregir|aplicar|arreglar|fix|apply|run)\s+(el\s+|los\s+|the\s+)?(linting|lint|formato|format|prettier|eslint)\b/i

// Returns the reason to block, or null if the commit is fine.
export function checkCommit(command: string, branch: string): string | null {
  if (command.includes(OVERRIDE)) return null

  const message = extractMessage(command)
  if (message === null || /^Merge\b/.test(message)) return null

  const ticket = ticketOf(branch)

  if (ticket !== null && !HAS_TICKET.test(message)) {
    return (
      `commit-ticket: the branch ${branch} has the ticket ${ticket}, so the message must be ` +
      `"[TICKET] description". Use: [${ticket}] ${message}`
    )
  }

  if (LINT_ONLY.test(message)) {
    return (
      'commit-ticket: no commits that only fix linting or formatting. Run the autofix (eslint --fix, prettier --write) ' +
      'and keep the result inside the commit of the change that caused it (git commit --amend or a fixup).'
    )
  }

  return null
}
