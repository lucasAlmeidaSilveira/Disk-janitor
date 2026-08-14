import { join } from 'node:path'
import { expandPath } from '../domain/safety'
import { trashPath } from '../domain/trash'
import { measurePath } from './du'

const ELECTRON_CACHE_SUBDIRS = [
  'Cache',
  'Code Cache',
  'GPUCache',
  'DawnCache',
  'Service Worker/CacheStorage',
  'Service Worker/ScriptCache',
] as const

export type AppCacheTarget = {
  id: string
  label: string
  base: string
  note?: string
}

const cacheSubpaths = (base: string): string[] =>
  ELECTRON_CACHE_SUBDIRS.map((sub) => join(expandPath(base), sub))

export async function measureAppCache(base: string): Promise<number> {
  const sizes = await Promise.all(cacheSubpaths(base).map((p) => measurePath(p)))
  return sizes.reduce((sum, s) => sum + s.bytes, 0)
}

export async function cleanAppCache(base: string): Promise<number> {
  let freed = 0
  for (const dir of cacheSubpaths(base)) {
    try {
      freed += await trashPath(dir)
    } catch {
      // skip missing or locked subdir
    }
  }
  return freed
}
