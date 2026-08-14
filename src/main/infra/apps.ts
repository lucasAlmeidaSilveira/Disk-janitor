import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ScanItem } from '@shared/ipc-contract'
import { measurePath } from './du'
import { tryRun } from './shell'

const APPS_DIR = '/Applications'
const UNUSED_THRESHOLD_DAYS = 180

async function listAppBundles(): Promise<string[]> {
  const entries = await readdir(APPS_DIR, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isDirectory() && e.name.endsWith('.app'))
    .map((e) => join(APPS_DIR, e.name))
}

async function readLastOpened(appPath: string): Promise<Date | null> {
  const result = await tryRun('mdls', ['-raw', '-name', 'kMDItemLastUsedDate', appPath], {
    timeoutMs: 5_000,
  })
  if (!result) return null
  const value = result.stdout.trim()
  if (!value || value === '(null)') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function scanUnusedApps(): Promise<ScanItem[]> {
  const bundles = await listAppBundles()
  const cutoff = Date.now() - UNUSED_THRESHOLD_DAYS * 86_400 * 1000

  const items: ScanItem[] = []
  await Promise.all(
    bundles.map(async (bundlePath) => {
      const [lastOpened, size] = await Promise.all([
        readLastOpened(bundlePath),
        measurePath(bundlePath),
      ])
      if (!size.exists || size.bytes === 0) return

      const isUnused = !lastOpened || lastOpened.getTime() < cutoff
      if (!isUnused) return

      items.push({
        id: `app:${basename(bundlePath, '.app')}`,
        label: basename(bundlePath, '.app'),
        path: bundlePath,
        bytes: size.bytes,
        ...(lastOpened ? { lastModified: lastOpened.toISOString() } : {}),
        cleanable: true,
        note: lastOpened
          ? `Última vez aberto em ${lastOpened.toLocaleDateString('pt-BR')}`
          : 'Nunca aberto (segundo Spotlight)',
      })
    })
  )

  items.sort((a, b) => b.bytes - a.bytes)
  return items
}
