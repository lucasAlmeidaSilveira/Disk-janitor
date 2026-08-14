import { app } from 'electron'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { CleanupResult, HistoryEntry } from '@shared/ipc-contract'
import { HistoryEntry as HistoryEntrySchema } from '@shared/ipc-contract'

const MAX_ENTRIES_RETURNED = 50

function historyFile(): string {
  return join(app.getPath('userData'), 'history.jsonl')
}

async function ensureFileDir(): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
}

export async function appendHistory(
  result: CleanupResult,
  categoryLabel: string
): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: randomUUID(),
    categoryId: result.categoryId,
    categoryLabel,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    freedBytes: result.freedBytes,
    successCount: result.successCount,
    failedCount: result.failed.length,
  }
  await ensureFileDir()
  await appendFile(historyFile(), JSON.stringify(entry) + '\n', 'utf8')
  return entry
}

export async function readHistory(): Promise<HistoryEntry[]> {
  const raw = await readFile(historyFile(), 'utf8').catch(() => '')
  if (!raw.trim()) return []

  const entries: HistoryEntry[] = []
  for (const line of raw.trim().split('\n')) {
    try {
      const parsed = HistoryEntrySchema.parse(JSON.parse(line))
      entries.push(parsed)
    } catch {
      // ignore malformed line
    }
  }
  return entries.reverse().slice(0, MAX_ENTRIES_RETURNED)
}
