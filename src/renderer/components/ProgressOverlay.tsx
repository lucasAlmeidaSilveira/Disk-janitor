import { Loader2 } from 'lucide-react'
import type { CleanupProgress } from '@shared/ipc-contract'
import { formatBytes } from '@renderer/lib/format'

type ProgressOverlayProps = {
  progress: CleanupProgress
}

export function ProgressOverlay({ progress }: ProgressOverlayProps) {
  const pct = progress.total > 0 ? (progress.currentIndex / progress.total) * 100 : 0

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="w-[420px] rounded-xl border border-border/70 bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <h3 className="text-base font-semibold">Enviando para Lixeira</h3>
            <p className="text-sm text-muted-foreground">
              {progress.currentIndex} de {progress.total} · {progress.currentLabel}
            </p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
          {formatBytes(progress.freedBytes)} liberado
        </p>
      </div>
    </div>
  )
}
