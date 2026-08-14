import type { ScanItem } from '@shared/ipc-contract'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { formatBytes } from '@renderer/lib/format'

type PreviewDialogProps = {
  open: boolean
  items: ScanItem[]
  onCancel: () => void
  onConfirm: () => void
}

export function PreviewDialog({ open, items, onCancel, onConfirm }: PreviewDialogProps) {
  const total = items.reduce((sum, item) => sum + item.bytes, 0)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirmar limpeza</DialogTitle>
          <DialogDescription>
            Os itens abaixo serão enviados para a Lixeira. Você pode restaurar de lá enquanto ela
            não for esvaziada.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-md border border-border/60 bg-muted/30">
          <ul className="divide-y divide-border/50 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.label}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{item.path}</p>
                </div>
                <span className="font-mono text-sm tabular-nums">{formatBytes(item.bytes)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-mono text-base font-semibold tabular-nums">{formatBytes(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar e limpar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
