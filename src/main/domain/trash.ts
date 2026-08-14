import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { shell } from 'electron'
import { measurePath } from '../infra/du'
import { assertAllowed } from './safety'

export async function trashPath(path: string): Promise<number> {
  const safe = assertAllowed(path)
  const size = await measurePath(safe)
  if (!size.exists) return 0
  await shell.trashItem(safe)
  return size.bytes
}

export async function trashChildren(directory: string): Promise<number> {
  const safe = assertAllowed(directory)
  const entries = await readdir(safe).catch(() => [])
  let freed = 0
  for (const entry of entries) {
    if (entry === '.' || entry === '..') continue
    try {
      freed += await trashPath(join(safe, entry))
    } catch {
      // best effort — skip files locked by OS/apps
    }
  }
  return freed
}
