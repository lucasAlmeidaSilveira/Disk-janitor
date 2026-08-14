import { ipcMain } from 'electron'
import { IpcChannel } from '@shared/ipc-contract'
import { readHistory } from '../domain/history'

export function registerHistoryHandlers(): void {
  ipcMain.handle(IpcChannel.HistoryList, async () => readHistory())
}
