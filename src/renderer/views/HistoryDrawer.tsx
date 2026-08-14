import { Clock, X } from 'lucide-react'
import type { HistoryEntry } from '@shared/ipc-contract'
import { Button } from '@renderer/components/ui/button'
import { formatBytes, formatDate } from '@renderer/lib/format'
import { cn } from '@renderer/lib/utils'
import { useScanStore } from '@renderer/store/scan.store'

export function HistoryDrawer() {
  const open = useScanStore((s) => s.historyOpen)
  const toggle = useScanStore((s) => s.toggleHistory)
  const history = useScanStore((s) => s.history)

  return (
    <>
      <div
        onClick={toggle}
        className={cn(
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-border/60 bg-card shadow-2xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Histórico de limpezas</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
          {history.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Nenhuma limpeza realizada ainda.
            </p>
          ) : (
            <ul className="space-y-1">
              {history.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="rounded-md px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium">{entry.categoryLabel}</p>
        <span className="shrink-0 font-mono text-sm font-semibold text-[hsl(var(--safe))] tabular-nums">
          {formatBytes(entry.freedBytes)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDate(entry.finishedAt)} · {entry.successCount} item{entry.successCount === 1 ? '' : 'ns'}
        {entry.failedCount > 0 && ` · ${entry.failedCount} falhou`}
      </p>
    </li>
  )
}
