import { HardDrive } from 'lucide-react'
import type { DiskUsage } from '@shared/ipc-contract'
import { formatBytes, formatPercent } from '@renderer/lib/format'
import { cn } from '@renderer/lib/utils'

type DiskGaugeProps = { disk: DiskUsage | null; loading?: boolean }

export function DiskGauge({ disk, loading }: DiskGaugeProps) {
  const usedPct = disk ? Math.min(100, (disk.usedBytes / disk.totalBytes) * 100) : 0
  const tone = usedPct > 85 ? 'high' : usedPct > 70 ? 'mid' : 'low'

  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary/70">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Volume principal</h2>
            <p className="text-xs text-muted-foreground/80">{disk?.mountedOn ?? '—'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {disk ? formatBytes(disk.freeBytes) : loading ? '...' : '—'}
          </p>
          <p className="text-xs text-muted-foreground">livres</p>
        </div>
      </header>

      <div className="mt-6">
        <div className="relative h-3 overflow-hidden rounded-full bg-secondary/60">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              tone === 'low' && 'bg-[hsl(var(--safe))]',
              tone === 'mid' && 'bg-[hsl(var(--caution))]',
              tone === 'high' && 'bg-[hsl(var(--review))]'
            )}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-mono tabular-nums text-foreground">
              {disk ? formatBytes(disk.usedBytes) : '—'}
            </span>{' '}
            usados
            {disk && ` · ${formatPercent(disk.usedBytes, disk.totalBytes)}`}
          </span>
          <span>
            de{' '}
            <span className="font-mono tabular-nums text-foreground">
              {disk ? formatBytes(disk.totalBytes) : '—'}
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}
