import { Loader2, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { formatBytes } from '@renderer/lib/format'

type CleanupBarProps = {
  selectedCount: number
  selectedBytes: number
  cleaning: boolean
  onClear: () => void
  onPreview: () => void
}

export function CleanupBar({
  selectedCount,
  selectedBytes,
  cleaning,
  onClear,
  onPreview,
}: CleanupBarProps) {
  const disabled = selectedCount === 0

  return (
    <div className="pointer-events-none sticky bottom-0 left-0 right-0 mt-6 px-8 pb-6">
      <div className="pointer-events-auto mx-auto flex max-w-4xl items-center justify-between rounded-full border border-border/70 bg-card/95 px-5 py-3 shadow-2xl backdrop-blur">
        <div className="flex items-baseline gap-3">
          <p className="text-sm text-muted-foreground">
            {disabled ? 'Nenhum item selecionado' : `${selectedCount} selecionado${selectedCount === 1 ? '' : 's'}`}
          </p>
          {!disabled && (
            <p className="font-mono text-base font-semibold tabular-nums">
              {formatBytes(selectedBytes)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled || cleaning}>
            Limpar seleção
          </Button>
          <Button size="sm" onClick={onPreview} disabled={disabled || cleaning}>
            {cleaning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Limpando
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Enviar para Lixeira
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
