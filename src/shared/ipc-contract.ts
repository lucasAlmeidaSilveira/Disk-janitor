import { z } from 'zod'

export const SafetyTier = z.enum(['safe', 'caution', 'review'])
export type SafetyTier = z.infer<typeof SafetyTier>

export const DiskUsage = z.object({
  totalBytes: z.number().int().nonnegative(),
  usedBytes: z.number().int().nonnegative(),
  freeBytes: z.number().int().nonnegative(),
  mountedOn: z.string(),
})
export type DiskUsage = z.infer<typeof DiskUsage>

export const CategoryMeta = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  tier: SafetyTier,
  icon: z.string(),
})
export type CategoryMeta = z.infer<typeof CategoryMeta>

export const ScanItem = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  lastModified: z.string().datetime().optional(),
  note: z.string().optional(),
  cleanable: z.boolean().default(true),
})
export type ScanItem = z.infer<typeof ScanItem>

export const ScanResult = z.object({
  categoryId: z.string(),
  scannedAt: z.string().datetime(),
  totalBytes: z.number().int().nonnegative(),
  items: z.array(ScanItem),
  errors: z.array(z.object({ path: z.string(), message: z.string() })),
})
export type ScanResult = z.infer<typeof ScanResult>

export const CategoryScanRequest = z.object({ categoryId: z.string() })
export type CategoryScanRequest = z.infer<typeof CategoryScanRequest>

export const CleanupRequest = z.object({
  categoryId: z.string(),
  itemIds: z.array(z.string()).min(1),
})
export type CleanupRequest = z.infer<typeof CleanupRequest>

export const CleanupFailure = z.object({
  itemId: z.string(),
  path: z.string(),
  message: z.string(),
})
export type CleanupFailure = z.infer<typeof CleanupFailure>

export const CleanupResult = z.object({
  categoryId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  freedBytes: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failed: z.array(CleanupFailure),
})
export type CleanupResult = z.infer<typeof CleanupResult>

export const CleanupProgress = z.object({
  categoryId: z.string(),
  currentIndex: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currentLabel: z.string(),
  freedBytes: z.number().int().nonnegative(),
})
export type CleanupProgress = z.infer<typeof CleanupProgress>

export const HistoryEntry = z.object({
  id: z.string(),
  categoryId: z.string(),
  categoryLabel: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  freedBytes: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
})
export type HistoryEntry = z.infer<typeof HistoryEntry>

export const IpcChannel = {
  DiskRead: 'disk:read',
  CategoriesList: 'categories:list',
  CategoryScan: 'category:scan',
  CategoryClean: 'category:clean',
  HistoryList: 'history:list',
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]

export const IpcEvent = {
  CleanupProgress: 'cleanup:progress',
} as const

export type IpcEvent = (typeof IpcEvent)[keyof typeof IpcEvent]
