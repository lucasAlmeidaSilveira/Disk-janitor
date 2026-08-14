import { Clock, RefreshCw, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { CategoryCard } from '@renderer/components/CategoryCard'
import { DiskGauge } from '@renderer/components/DiskGauge'
import { Logo } from '@renderer/components/Logo'
import { formatBytes } from '@renderer/lib/format'
import { useScanStore } from '@renderer/store/scan.store'

export function Dashboard() {
  const disk = useScanStore((s) => s.disk)
  const diskLoading = useScanStore((s) => s.diskLoading)
  const categories = useScanStore((s) => s.categories)
  const scans = useScanStore((s) => s.scans)
  const loadingIds = useScanStore((s) => s.loadingCategoryIds)
  const refreshDisk = useScanStore((s) => s.refreshDisk)
  const runScan = useScanStore((s) => s.runScan)
  const runAllSafeScans = useScanStore((s) => s.runAllSafeScans)
  const openCategory = useScanStore((s) => s.openCategory)
  const toggleHistory = useScanStore((s) => s.toggleHistory)

  const totalPotential = useMemo(
    () => Object.values(scans).reduce((sum, r) => sum + r.totalBytes, 0),
    [scans]
  )
  const anySafeLoading = categories.some((c) => c.tier === 'safe' && loadingIds.has(c.id))

  return (
    <div className="flex h-full flex-col">
      <header className="drag-region flex items-center justify-between px-8 pb-4 pt-16">
        <div className="flex items-center gap-3 pl-16">
          <Logo className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Disk Janitor</h1>
            <p className="text-sm text-muted-foreground">
              Diagnóstico e limpeza do disco, por categorias.
            </p>
          </div>
        </div>
        <div className="no-drag flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleHistory}>
            <Clock className="h-4 w-4" />
            Histórico
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshDisk} disabled={diskLoading}>
            <RefreshCw className={diskLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Atualizar disco
          </Button>
          <Button size="sm" onClick={runAllSafeScans} disabled={anySafeLoading}>
            <Sparkles className="h-4 w-4" />
            Escanear categorias seguras
          </Button>
        </div>
      </header>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-8 pb-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <DiskGauge disk={disk} loading={diskLoading} />

          {totalPotential > 0 && (
            <div className="rounded-xl border border-[hsl(var(--safe))/0.3] bg-[hsl(var(--safe))/0.06] px-5 py-3 text-sm">
              <span className="text-muted-foreground">Potencial identificado nas categorias escaneadas:</span>{' '}
              <span className="font-mono font-semibold text-[hsl(var(--safe))]">
                {formatBytes(totalPotential)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                scan={scans[category.id]}
                loading={loadingIds.has(category.id)}
                onScan={() => runScan(category.id)}
                onOpen={() => openCategory(category.id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
