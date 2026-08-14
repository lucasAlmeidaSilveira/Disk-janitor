import { ipcMain } from 'electron'
import { CategoryScanRequest, IpcChannel } from '@shared/ipc-contract'
import { listCategories } from '../domain/categories'
import { scanCategory } from '../domain/scanner'
import { readDiskUsage } from '../infra/df'

export function registerScanHandlers(): void {
  ipcMain.handle(IpcChannel.DiskRead, async () => {
    return readDiskUsage()
  })

  ipcMain.handle(IpcChannel.CategoriesList, async () => {
    return listCategories()
  })

  ipcMain.handle(IpcChannel.CategoryScan, async (_event, rawRequest: unknown) => {
    const request = CategoryScanRequest.parse(rawRequest)
    return scanCategory(request.categoryId)
  })
}
