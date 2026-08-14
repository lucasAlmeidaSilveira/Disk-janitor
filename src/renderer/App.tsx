import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { Dashboard } from './views/Dashboard'
import { CategoryView } from './views/CategoryView'
import { HistoryDrawer } from './views/HistoryDrawer'
import { ProgressOverlay } from './components/ProgressOverlay'
import { useScanStore } from './store/scan.store'

export function App() {
  const bootstrap = useScanStore((s) => s.bootstrap)
  const activeCategoryId = useScanStore((s) => s.activeCategoryId)
  const categories = useScanStore((s) => s.categories)
  const scans = useScanStore((s) => s.scans)
  const ingestProgress = useScanStore((s) => s.ingestProgress)
  const cleanupProgress = useScanStore((s) => s.cleanupProgress)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    return window.janitor.onCleanupProgress(ingestProgress)
  }, [ingestProgress])

  const activeCategory = categories.find((c) => c.id === activeCategoryId)

  return (
    <div className="h-full">
      {activeCategory ? (
        <CategoryView category={activeCategory} scan={scans[activeCategory.id]} />
      ) : (
        <Dashboard />
      )}
      <HistoryDrawer />
      {cleanupProgress && <ProgressOverlay progress={cleanupProgress} />}
      <Toaster theme="dark" position="bottom-center" richColors closeButton />
    </div>
  )
}
