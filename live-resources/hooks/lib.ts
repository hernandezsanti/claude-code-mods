const GB = 1024 ** 3

// "Available" memory the macOS way: free + inactive + speculative + purgeable.
// `vm_stat` reports pages, and the page size is on its first line.
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

// `df -k /`: column 4 of the second line is the available space, in KB.
export function parseDfAvailable(text: string): number | null {
  const row = text.trim().split('\n')[1]?.trim().split(/\s+/)
  const kb = Number(row?.[3])
  return Number.isFinite(kb) && row?.[3] !== undefined ? kb * 1024 : null
}

const RUNNER =
  /\b(jest|vitest|rspec|parallel_rspec|playwright test|tsx --test|node --test|bun test|pytest)\b/

// Test processes in `ps -axo command`, without counting `ps` itself or the
// `grep` commands that someone started to look for them.
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
  return `${mark}RAM ${gb(ramBytes)} free · disk ${gb(diskBytes)}${tests}`
}
