import { stat } from 'node:fs/promises'
import { tryRun } from './shell'

const KIB = 1024

export type PathSize = {
  path: string
  bytes: number
  exists: boolean
}

export async function measurePath(path: string): Promise<PathSize> {
  const info = await stat(path).catch(() => null)
  if (!info) return { path, bytes: 0, exists: false }

  if (info.isFile()) {
    return { path, bytes: info.blocks * 512, exists: true }
  }

  const result = await tryRun('du', ['-sk', path], { timeoutMs: 60_000 })
  if (!result) return { path, bytes: 0, exists: true }

  const kib = Number(result.stdout.trim().split(/\s+/)[0])
  return { path, bytes: Number.isFinite(kib) ? kib * KIB : 0, exists: true }
}

export async function measureMany(paths: readonly string[]): Promise<PathSize[]> {
  return Promise.all(paths.map(measurePath))
}
