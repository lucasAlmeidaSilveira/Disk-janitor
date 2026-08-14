import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname } from 'node:path'
import type { ScanItem } from '@shared/ipc-contract'
import { tryRun } from './shell'

const MIN_BYTES = 500 * 1024 * 1024
const MAX_ITEMS = 30

const SKIP_PATTERNS: RegExp[] = [
  /\/node_modules\//,
  /\/\.git\//,
  /\/\.venv\//,
  /\/venv\//,
  /\/__pycache__\//,
  /\/\.(app|photoslibrary|musiclibrary|imovielibrary|framework|bundle|kext|pkg)\//i,
  /\/Library\/Containers\/com\.docker\.docker\//,
  /\/Library\/CloudStorage\//,
]

const shouldSkip = (path: string): boolean => SKIP_PATTERNS.some((re) => re.test(path))

const prettifyDir = (path: string): string => {
  const home = homedir()
  const dir = dirname(path)
  return dir.startsWith(home) ? '~' + dir.slice(home.length) : dir
}

export async function scanLargeFiles(): Promise<ScanItem[]> {
  const home = homedir()
  const query = `kMDItemFSSize > ${MIN_BYTES}`
  const result = await tryRun('mdfind', ['-onlyin', home, query], { timeoutMs: 30_000 })
  if (!result) return []

  const paths = result.stdout
    .trim()
    .split('\n')
    .filter((line) => line && !shouldSkip(line))

  const items: ScanItem[] = []
  await Promise.all(
    paths.map(async (path) => {
      const stats = await stat(path).catch(() => null)
      if (!stats || !stats.isFile()) return
      items.push({
        id: `lf:${path}`,
        label: basename(path),
        path,
        bytes: stats.blocks * 512,
        lastModified: stats.mtime.toISOString(),
        cleanable: true,
        note: prettifyDir(path),
      })
    })
  )

  items.sort((a, b) => b.bytes - a.bytes)
  return items.slice(0, MAX_ITEMS)
}
