import { homedir } from 'node:os'
import { resolve } from 'node:path'

const HOME = homedir()

const ALLOWED_ROOTS = [HOME, '/Applications', '/opt/homebrew'] as const

export function expandPath(path: string): string {
  return path.startsWith('~/') ? resolve(HOME, path.slice(2)) : resolve(path)
}

export function isAllowedPath(rawPath: string): boolean {
  const path = expandPath(rawPath)
  return ALLOWED_ROOTS.some((root) => path === root || path.startsWith(root + '/'))
}

export function assertAllowed(rawPath: string): string {
  const path = expandPath(rawPath)
  if (!isAllowedPath(path)) {
    throw new Error(`path not allowed: ${path}`)
  }
  return path
}
