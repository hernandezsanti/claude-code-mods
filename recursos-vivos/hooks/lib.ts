const GB = 1024 ** 3

// Memoria "disponible" a la macOS: libre + inactiva + especulativa + purgable.
// `vm_stat` informa páginas, y el tamaño de página va en su primera línea.
export function parseVmStat(text: string): number | null {
  const pageSize = Number(/page size of (\d+) bytes/.exec(text)?.[1])
  if (!pageSize) return null

  const pages = (label: string): number =>
    Number(new RegExp(`^${label}:\\s+(\\d+)\\.`, 'm').exec(text)?.[1] ?? 0)

  const available =
    pages('Pages free') +
    pages('Pages inactive') +
    pages('Pages speculative') +
    pages('Pages purgeable')

  return available * pageSize
}

// `df -k /`: la columna 4 de la segunda línea es lo disponible, en KB.
export function parseDfAvailable(text: string): number | null {
  const row = text.trim().split('\n')[1]?.trim().split(/\s+/)
  const kb = Number(row?.[3])
  return Number.isFinite(kb) && row?.[3] !== undefined ? kb * 1024 : null
}

const RUNNER =
  /\b(jest|vitest|rspec|parallel_rspec|playwright test|tsx --test|node --test|bun test|pytest)\b/

// Procesos de test en `ps -axo command`, sin contar al propio `ps` ni a los
// `grep` que alguien haya lanzado para buscarlos.
export function countRunners(psText: string): number {
  return psText
    .split('\n')
    .filter(line => RUNNER.test(line) && !/\b(grep|pgrep|ps -axo)\b/.test(line))
    .length
}

export type Level = 'ok' | 'warn' | 'critical'

export function levelOf(ramBytes: number | null, diskBytes: number | null): Level {
  const ram = ramBytes ?? Infinity
  const disk = diskBytes ?? Infinity
  if (ram < 1 * GB || disk < 5 * GB) return 'critical'
  if (ram < 2.5 * GB || disk < 10 * GB) return 'warn'
  return 'ok'
}

const gb = (bytes: number | null): string =>
  bytes === null ? '?' : `${(bytes / GB).toFixed(1)}G`

export function formatStatus(
  ramBytes: number | null,
  diskBytes: number | null,
  runners: number,
): string {
  const mark = { ok: '', warn: '! ', critical: '!! ' }[levelOf(ramBytes, diskBytes)]
  const tests = runners > 0 ? ` · tests ${runners}` : ''
  return `${mark}RAM ${gb(ramBytes)} libre · disco ${gb(diskBytes)}${tests}`
}
