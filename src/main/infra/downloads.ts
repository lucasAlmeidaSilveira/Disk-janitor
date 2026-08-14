import { readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { ScanItem } from '@shared/ipc-contract'
import { expandPath } from '../domain/safety'

const DOWNLOADS_DIR = '~/Downloads'
const INSTALLER_EXTENSIONS = new Set(['.dmg', '.pkg', '.iso', '.zip', '.tar.gz', '.xz'])
const AGE_THRESHOLD_DAYS = 30

const oneOfExtensions = (name: string): boolean => {
  const lower = name.toLowerCase()
  if (INSTALLER_EXTENSIONS.has(extname(lower))) return true
  return [...INSTALLER_EXTENSIONS].some((ext) => lower.endsWith(ext))
}

export async function scanOldInstallers(): Promise<ScanItem[]> {
  const dir = expandPath(DOWNLOADS_DIR)
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const cutoff = Date.now() - AGE_THRESHOLD_DAYS * 86_400 * 1000

  const items: ScanItem[] = []
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile()) return
      if (!oneOfExtensions(entry.name)) return

      const fullPath = join(dir, entry.name)
      const stats = await stat(fullPath).catch(() => null)
      if (!stats || stats.mtimeMs > cutoff) return

      items.push({
        id: `dl:${entry.name}`,
        label: entry.name,
        path: fullPath,
        bytes: stats.blocks * 512,
        lastModified: stats.mtime.toISOString(),
        cleanable: true,
        note: `Modificado em ${stats.mtime.toLocaleDateString('pt-BR')}`,
      })
    })
  )

  items.sort((a, b) => b.bytes - a.bytes)
  return items
}
