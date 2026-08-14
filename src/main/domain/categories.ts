import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { CategoryMeta, ScanItem } from '@shared/ipc-contract'
import { cleanAppCache, measureAppCache, type AppCacheTarget } from '../infra/appCaches'
import { scanUnusedApps } from '../infra/apps'
import { pruneDocker, readDockerState } from '../infra/docker'
import { scanOldInstallers } from '../infra/downloads'
import { measurePath } from '../infra/du'
import { scanLargeFiles } from '../infra/largeFiles'
import { activeWallpaperIds } from '../infra/wallpaper'
import { expandPath } from './safety'
import { trashChildren, trashPath } from './trash'

type Target = {
  id: string
  label: string
  path: string
  note?: string
}

type ScanOutput = {
  items: ScanItem[]
  errors: Array<{ path: string; message: string }>
}

export type Category = {
  meta: CategoryMeta
  scan: () => Promise<ScanOutput>
  cleanItem: (item: ScanItem) => Promise<number>
}

const measureTargets = async (targets: readonly Target[]): Promise<ScanOutput> => {
  const errors: ScanOutput['errors'] = []
  const items: ScanItem[] = []

  await Promise.all(
    targets.map(async (target) => {
      const expanded = expandPath(target.path)
      try {
        const size = await measurePath(expanded)
        if (!size.exists) return
        items.push({
          id: target.id,
          label: target.label,
          path: expanded,
          bytes: size.bytes,
          cleanable: true,
          ...(target.note ? { note: target.note } : {}),
        })
      } catch (err) {
        errors.push({ path: expanded, message: err instanceof Error ? err.message : String(err) })
      }
    })
  )

  items.sort((a, b) => b.bytes - a.bytes)
  return { items, errors }
}

const BROWSER_TARGETS: Target[] = [
  { id: 'spotify', label: 'Spotify cache', path: '~/Library/Caches/com.spotify.client' },
  { id: 'arc-caches', label: 'Arc cache', path: '~/Library/Caches/Arc' },
  { id: 'arc-browser', label: 'Arc Browser cache', path: '~/Library/Caches/company.thebrowser.Browser' },
  { id: 'chrome', label: 'Google/Chrome cache', path: '~/Library/Caches/Google' },
  { id: 'cloudkit', label: 'CloudKit cache', path: '~/Library/Caches/CloudKit' },
  { id: 'beekeeper', label: 'Beekeeper Studio updater', path: '~/Library/Caches/beekeeper-studio-updater' },
  { id: 'gather', label: 'Gather updater', path: '~/Library/Caches/gather-electron-updater' },
  { id: 'figma', label: 'Figma updater', path: '~/Library/Caches/com.figma.Desktop.ShipIt' },
  { id: 'playwright', label: 'Playwright browsers', path: '~/Library/Caches/ms-playwright' },
  { id: 'typescript', label: 'TypeScript cache', path: '~/Library/Caches/typescript' },
]

const DEV_TARGETS: Target[] = [
  { id: 'pnpm', label: 'pnpm store', path: '~/Library/pnpm' },
  { id: 'npm', label: 'npm cache', path: '~/.npm' },
  { id: 'cache', label: '~/.cache', path: '~/.cache' },
  { id: 'gradle', label: 'Gradle caches', path: '~/.gradle' },
]

const WALLPAPER_TARGET: Target = {
  id: 'aerials',
  label: 'Aerial wallpaper videos',
  path: '~/Library/Application Support/com.apple.wallpaper/aerials/videos',
  note: 'Vídeos de wallpapers dinâmicos. Preserva o wallpaper atualmente ativo.',
}

const cleanChildren = (item: ScanItem) => trashChildren(item.path)

const cleanWallpaperItem = async (item: ScanItem): Promise<number> => {
  const active = await activeWallpaperIds()
  const dir = expandPath(item.path)
  const entries = await readdir(dir).catch(() => [])
  let freed = 0
  for (const entry of entries) {
    const uuid = basename(entry, '.mov').toUpperCase()
    if (active.has(uuid)) continue
    try {
      freed += await trashPath(join(dir, entry))
    } catch {
      // skip locked file
    }
  }
  return freed
}

const cleanDockerItem = async (item: ScanItem): Promise<number> => {
  if (item.id === 'docker-reclaimable') return pruneDocker()
  return 0
}

const APP_CACHE_TARGETS: AppCacheTarget[] = [
  {
    id: 'claude',
    label: 'Claude',
    base: '~/Library/Application Support/Claude',
    note: 'Cache Electron (HTTP/GPU/code). Preserva sessões e checkpoints.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    base: '~/Library/Application Support/Cursor',
    note: 'Cache Electron. Preserva workspaces recentes e extensões.',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    base: '~/Library/Application Support/Code',
    note: 'Cache Electron. Preserva extensões, settings e workspaces.',
  },
  {
    id: 'discord',
    label: 'Discord',
    base: '~/Library/Application Support/discord',
    note: 'Cache de imagens/mídia. Preserva login (fica no Keychain).',
  },
  {
    id: 'notion',
    label: 'Notion',
    base: '~/Library/Application Support/Notion',
    note: 'Cache offline. Preserva login.',
  },
  {
    id: 'figma',
    label: 'Figma',
    base: '~/Library/Application Support/Figma',
    note: 'Cache Electron. Preserva drafts locais e login.',
  },
  {
    id: 'gather',
    label: 'GatherV2',
    base: '~/Library/Application Support/GatherV2',
    note: 'Cache Electron. Preserva login.',
  },
  {
    id: 'atlas',
    label: 'ChatGPT Atlas',
    base: '~/Library/Application Support/com.openai.atlas',
    note: 'Cache Electron. Preserva login e histórico.',
  },
]

const scanAppCaches = async (): Promise<ScanOutput> => {
  const items: ScanItem[] = []
  await Promise.all(
    APP_CACHE_TARGETS.map(async (target) => {
      const bytes = await measureAppCache(target.base)
      if (bytes <= 0) return
      items.push({
        id: target.id,
        label: target.label,
        path: expandPath(target.base),
        bytes,
        cleanable: true,
        ...(target.note ? { note: target.note } : {}),
      })
    })
  )
  items.sort((a, b) => b.bytes - a.bytes)
  return { items, errors: [] }
}

const cleanAppCacheItem = async (item: ScanItem): Promise<number> => {
  const target = APP_CACHE_TARGETS.find((t) => t.id === item.id)
  if (!target) return 0
  return cleanAppCache(target.base)
}

const CATEGORIES: Category[] = [
  {
    meta: {
      id: 'browser-caches',
      label: 'Caches de browsers e apps',
      description: 'Caches de Spotify, Arc, Chrome e updaters. Re-cachea sozinho, não desloga.',
      tier: 'safe',
      icon: 'globe',
    },
    scan: () => measureTargets(BROWSER_TARGETS),
    cleanItem: cleanChildren,
  },
  {
    meta: {
      id: 'dev-tools',
      label: 'Ferramentas de dev',
      description: 'pnpm store, npm cache, ~/.cache. Regenera quando você rodar os projetos.',
      tier: 'safe',
      icon: 'terminal',
    },
    scan: () => measureTargets(DEV_TARGETS),
    cleanItem: cleanChildren,
  },
  {
    meta: {
      id: 'docker',
      label: 'Docker',
      description: 'Volumes/imagens órfãos e Docker.raw (sparse — geralmente menor que aparenta).',
      tier: 'safe',
      icon: 'container',
    },
    scan: async () => {
      const state = await readDockerState()
      const items: ScanItem[] = []
      if (state.raw.exists) {
        items.push({
          id: 'docker-raw',
          label: 'Docker.raw (uso real)',
          path: state.raw.path,
          bytes: state.raw.bytes,
          cleanable: false,
          note: 'Sparse file — o tamanho real cresce e encolhe com o uso da VM.',
        })
      }
      if (state.reclaimableBytes !== null && state.reclaimableBytes > 0) {
        items.push({
          id: 'docker-reclaimable',
          label: 'Recuperável via prune',
          path: 'docker system prune -a --volumes',
          bytes: state.reclaimableBytes,
          cleanable: true,
          note: state.daemonRunning
            ? 'Estimativa do daemon. Inclui build cache, imagens/volumes órfãos.'
            : 'Docker Desktop precisa estar rodando para estimar.',
        })
      }
      return { items, errors: [] }
    },
    cleanItem: cleanDockerItem,
  },
  {
    meta: {
      id: 'wallpapers',
      label: 'Wallpapers dinâmicos (aerials)',
      description: 'Vídeos de wallpapers que você experimentou. Re-baixam se reabilitar.',
      tier: 'safe',
      icon: 'image',
    },
    scan: () => measureTargets([WALLPAPER_TARGET]),
    cleanItem: cleanWallpaperItem,
  },
  {
    meta: {
      id: 'app-caches',
      label: 'Caches de apps Electron',
      description: 'Cache HTTP/GPU/code de apps Electron. Preserva login e dados do usuário.',
      tier: 'caution',
      icon: 'layers',
    },
    scan: scanAppCaches,
    cleanItem: cleanAppCacheItem,
  },
  {
    meta: {
      id: 'old-downloads',
      label: 'Downloads antigos',
      description: 'Instaladores (.dmg, .pkg, .zip, .iso) em ~/Downloads com mais de 30 dias.',
      tier: 'caution',
      icon: 'download',
    },
    scan: async () => ({ items: await scanOldInstallers(), errors: [] }),
    cleanItem: (item) => trashPath(item.path),
  },
  {
    meta: {
      id: 'unused-apps',
      label: 'Apps não abertos há tempos',
      description: 'Apps em /Applications sem uso há mais de 6 meses (via Spotlight).',
      tier: 'review',
      icon: 'app',
    },
    scan: async () => ({ items: await scanUnusedApps(), errors: [] }),
    cleanItem: (item) => trashPath(item.path),
  },
  {
    meta: {
      id: 'large-files',
      label: 'Arquivos grandes',
      description: 'Top 30 arquivos com mais de 500 MB no seu $HOME (excluindo bundles e dev cruft).',
      tier: 'review',
      icon: 'file',
    },
    scan: async () => ({ items: await scanLargeFiles(), errors: [] }),
    cleanItem: (item) => trashPath(item.path),
  },
]

export function listCategories(): CategoryMeta[] {
  return CATEGORIES.map((c) => c.meta)
}

export function findCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.meta.id === id)
}
