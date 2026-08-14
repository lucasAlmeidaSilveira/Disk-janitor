import { expandPath } from '../domain/safety'
import { tryRun } from './shell'

const INDEX_PLIST = '~/Library/Application Support/com.apple.wallpaper/Store/Index.plist'

const UUID_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i

export async function activeWallpaperIds(): Promise<Set<string>> {
  const result = await tryRun('plutil', ['-convert', 'json', '-o', '-', expandPath(INDEX_PLIST)])
  if (!result) return new Set()

  const found = new Set<string>()
  try {
    walk(JSON.parse(result.stdout), found)
  } catch {
    // malformed plist — treat as unknown, be conservative and preserve everything
    return new Set(['__unknown__'])
  }
  return found
}

function walk(node: unknown, sink: Set<string>): void {
  if (typeof node === 'string') {
    if (UUID_PATTERN.test(node)) sink.add(node.toUpperCase())
    return
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, sink)
    return
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) walk(value, sink)
  }
}
