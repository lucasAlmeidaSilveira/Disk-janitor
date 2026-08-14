import { create } from 'zustand'
import type {
  CategoryMeta,
  CleanupProgress,
  CleanupResult,
  DiskUsage,
  HistoryEntry,
  ScanResult,
} from '@shared/ipc-contract'

type ScanState = {
  disk: DiskUsage | null
  categories: CategoryMeta[]
  scans: Record<string, ScanResult>
  loadingCategoryIds: Set<string>
  cleaningCategoryIds: Set<string>
  cleanupProgress: CleanupProgress | null
  activeCategoryId: string | null
  historyOpen: boolean
  history: HistoryEntry[]
  diskLoading: boolean

  bootstrap: () => Promise<void>
  refreshDisk: () => Promise<void>
  refreshHistory: () => Promise<void>
  runScan: (categoryId: string) => Promise<void>
  runAllSafeScans: () => Promise<void>
  cleanCategory: (categoryId: string, itemIds: string[]) => Promise<CleanupResult>
  ingestProgress: (progress: CleanupProgress) => void
  openCategory: (id: string) => void
  closeCategory: () => void
  toggleHistory: () => void
}

export const useScanStore = create<ScanState>((set, get) => ({
  disk: null,
  categories: [],
  scans: {},
  loadingCategoryIds: new Set(),
  cleaningCategoryIds: new Set(),
  cleanupProgress: null,
  activeCategoryId: null,
  historyOpen: false,
  history: [],
  diskLoading: false,

  bootstrap: async () => {
    const [disk, categories, history] = await Promise.all([
      window.janitor.readDisk(),
      window.janitor.listCategories(),
      window.janitor.listHistory(),
    ])
    set({ disk, categories, history })
  },

  refreshDisk: async () => {
    set({ diskLoading: true })
    try {
      set({ disk: await window.janitor.readDisk() })
    } finally {
      set({ diskLoading: false })
    }
  },

  refreshHistory: async () => {
    set({ history: await window.janitor.listHistory() })
  },

  runScan: async (categoryId) => {
    const loading = new Set(get().loadingCategoryIds)
    loading.add(categoryId)
    set({ loadingCategoryIds: loading })
    try {
      const result = await window.janitor.scanCategory(categoryId)
      set((state) => ({ scans: { ...state.scans, [categoryId]: result } }))
    } finally {
      const next = new Set(get().loadingCategoryIds)
      next.delete(categoryId)
      set({ loadingCategoryIds: next })
    }
  },

  runAllSafeScans: async () => {
    const safeIds = get().categories.filter((c) => c.tier === 'safe').map((c) => c.id)
    await Promise.all(safeIds.map((id) => get().runScan(id)))
  },

  cleanCategory: async (categoryId, itemIds) => {
    const cleaning = new Set(get().cleaningCategoryIds)
    cleaning.add(categoryId)
    set({ cleaningCategoryIds: cleaning, cleanupProgress: null })
    try {
      const result = await window.janitor.cleanCategory(categoryId, itemIds)
      await Promise.all([get().refreshDisk(), get().runScan(categoryId), get().refreshHistory()])
      return result
    } finally {
      const next = new Set(get().cleaningCategoryIds)
      next.delete(categoryId)
      set({ cleaningCategoryIds: next, cleanupProgress: null })
    }
  },

  ingestProgress: (progress) => set({ cleanupProgress: progress }),

  openCategory: (id) => set({ activeCategoryId: id }),
  closeCategory: () => set({ activeCategoryId: null }),

  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
}))
