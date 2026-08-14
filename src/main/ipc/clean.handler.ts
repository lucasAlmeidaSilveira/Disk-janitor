import { ipcMain } from 'electron'
import { CleanupRequest, IpcChannel, IpcEvent } from '@shared/ipc-contract'
import { cleanCategory } from '../domain/cleaner'

export function registerCleanHandlers(): void {
  ipcMain.handle(IpcChannel.CategoryClean, async (event, rawRequest: unknown) => {
    const request = CleanupRequest.parse(rawRequest)
    return cleanCategory(request, (progress) => {
      event.sender.send(IpcEvent.CleanupProgress, progress)
    })
  })
}
