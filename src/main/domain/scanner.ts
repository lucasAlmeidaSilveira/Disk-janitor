import type { ScanResult } from '@shared/ipc-contract'
import { findCategory } from './categories'

export async function scanCategory(categoryId: string): Promise<ScanResult> {
  const category = findCategory(categoryId)
  if (!category) throw new Error(`unknown category: ${categoryId}`)

  const { items, errors } = await category.scan()
  const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0)

  return {
    categoryId,
    scannedAt: new Date().toISOString(),
    totalBytes,
    items,
    errors,
  }
}
