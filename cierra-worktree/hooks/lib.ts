export const PR_CREATE = /\bgh\s+pr\s+create\b/

// Directorio donde corre el comando: el primer `cd X` o el `git -C X`.
// Si no hay ninguno, el del propio comando es el de la sesión.
export function commandDir(command: string, home: string): string | null {
  const raw =
    /^\s*cd\s+("[^"]+"|'[^']+'|[^\s&;]+)/m.exec(command)?.[1] ??
    /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(command)?.[1]
  if (!raw) return null
  const dir = raw.replace(/^["']|["']$/g, '')
  return dir.startsWith('~') ? home + dir.slice(1) : dir
}

export type Probe = {
  isWorktree: boolean
  root: string
  mainRepo: string
  dirtyFiles: number
  unpushed: number | null
}

// Salida de `git rev-parse --git-dir --git-common-dir --show-toplevel`.
export function parseLayout(revParse: string): { isWorktree: boolean; root: string; mainRepo: string } {
  const [gitDir = '', common = '', root = ''] = revParse.trim().split('\n').map(s => s.trim())
  const absolute = (p: string): string => (p.startsWith('/') ? p : `${root}/${p}`)
  const isWorktree = Boolean(gitDir && common) && absolute(gitDir) !== absolute(common)
  return { isWorktree, root, mainRepo: absolute(common).replace(/\/\.git\/?$/, '') }
}

export function advice(probe: Probe): string | null {
  if (!probe.isWorktree) return null

  const pending: string[] = []
  if (probe.dirtyFiles > 0) pending.push(`${probe.dirtyFiles} archivos sin commitear`)
  if (probe.unpushed === null) pending.push('commits sin pushear (la rama no tiene upstream)')
  else if (probe.unpushed > 0) pending.push(`${probe.unpushed} commits sin pushear`)

  if (pending.length > 0) {
    return (
      `cierra-worktree: el PR se abrió desde el worktree ${probe.root}, pero todavía tiene ${pending.join(' y ')}. ` +
      'No lo cierres: resuélvelo primero y avisa al usuario.'
    )
  }

  return (
    `cierra-worktree: el PR se abrió desde el worktree ${probe.root} y está limpio y pusheado. ` +
    `Ciérralo ahora con \`git -C ${probe.mainRepo} worktree remove ${probe.root}\` ` +
    '(la rama local y la remota quedan; si llegan correcciones de review se recrea con `git worktree add`).'
  )
}
