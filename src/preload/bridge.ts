import { contextBridge, ipcRenderer } from 'electron'
import type {
  CategoryMeta,
  CleanupProgress,
  CleanupResult,
  DiskUsage,
  HistoryEntry,
  ScanResult,
} from '@shared/ipc-contract'
import { IpcChannel, IpcEvent } from '@shared/ipc-contract'

const api = {
  readDisk: (): Promise<DiskUsage> => ipcRenderer.invoke(IpcChannel.DiskRead),
  listCategories: (): Promise<CategoryMeta[]> => ipcRenderer.invoke(IpcChannel.CategoriesList),
  scanCategory: (categoryId: string): Promise<ScanResult> =>
    ipcRenderer.invoke(IpcChannel.CategoryScan, { categoryId }),
  cleanCategory: (categoryId: string, itemIds: string[]): Promise<CleanupResult> =>
    ipcRenderer.invoke(IpcChannel.CategoryClean, { categoryId, itemIds }),
  listHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(IpcChannel.HistoryList),
  onCleanupProgress: (callback: (progress: CleanupProgress) => void): (() => void) => {
    const listener = (_event: unknown, progress: CleanupProgress) => callback(progress)
    ipcRenderer.on(IpcEvent.CleanupProgress, listener)
    return () => ipcRenderer.removeListener(IpcEvent.CleanupProgress, listener)
  },
}

export type JanitorApi = typeof api

contextBridge.exposeInMainWorld('janitor', api)
