import type {
  CleanupFailure,
  CleanupProgress,
  CleanupRequest,
  CleanupResult,
} from '@shared/ipc-contract'
import { findCategory } from './categories'
import { appendHistory } from './history'
import { scanCategory } from './scanner'

export type ProgressEmitter = (progress: CleanupProgress) => void

export async function cleanCategory(
  request: CleanupRequest,
  emit: ProgressEmitter
): Promise<CleanupResult> {
  const category = findCategory(request.categoryId)
  if (!category) throw new Error(`unknown category: ${request.categoryId}`)

  const startedAt = new Date().toISOString()
  const fresh = await scanCategory(request.categoryId)
  const items = fresh.items.filter(
    (item) => request.itemIds.includes(item.id) && item.cleanable !== false
  )

  let freedBytes = 0
  let successCount = 0
  const failed: CleanupFailure[] = []

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!
    emit({
      categoryId: request.categoryId,
      currentIndex: index,
      total: items.length,
      currentLabel: item.label,
      freedBytes,
    })

    try {
      const bytes = await category.cleanItem(item)
      freedBytes += bytes
      successCount += 1
    } catch (err) {
      failed.push({
        itemId: item.id,
        path: item.path,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  emit({
    categoryId: request.categoryId,
    currentIndex: items.length,
    total: items.length,
    currentLabel: 'Concluído',
    freedBytes,
  })

  const result: CleanupResult = {
    categoryId: request.categoryId,
    startedAt,
    finishedAt: new Date().toISOString(),
    freedBytes,
    successCount,
    failed,
  }

  await appendHistory(result, category.meta.label).catch(() => {
    // history is best-effort; never fail cleanup because of logging
  })

  return result
}
