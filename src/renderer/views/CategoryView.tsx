import { ArrowLeft, Info, RefreshCw, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { CategoryMeta, ScanItem, ScanResult } from '@shared/ipc-contract'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { CleanupBar } from '@renderer/components/CleanupBar'
import { PreviewDialog } from '@renderer/components/PreviewDialog'
import { SafetyBadge } from '@renderer/components/SafetyBadge'
import { formatBytes, formatDate } from '@renderer/lib/format'
import { useScanStore } from '@renderer/store/scan.store'
import { useSelectionStore } from '@renderer/store/selection.store'

type CategoryViewProps = {
  category: CategoryMeta
  scan: ScanResult | undefined
}

const TIER_EXPLANATION: Record<CategoryMeta['tier'], string> = {
  safe: 'Baixo risco: caches ou dados regeneráveis. Nenhum login é perdido.',
  caution: 'Risco médio: pode invalidar sessões locais ou cache offline dos apps.',
  review: 'Alto risco: envolve arquivos pessoais. Revise item por item.',
}

export function CategoryView({ category, scan }: CategoryViewProps) {
  const closeCategory = useScanStore((s) => s.closeCategory)
  const runScan = useScanStore((s) => s.runScan)
  const cleanCategory = useScanStore((s) => s.cleanCategory)
  const loading = useScanStore((s) => s.loadingCategoryIds.has(category.id))
  const cleaning = useScanStore((s) => s.cleaningCategoryIds.has(category.id))

  const selectedIds = useSelectionStore((s) => s.selection[category.id])
  const toggle = useSelectionStore((s) => s.toggle)
  const setAll = useSelectionStore((s) => s.setAll)
  const clear = useSelectionStore((s) => s.clear)

  const [previewOpen, setPreviewOpen] = useState(false)

  const cleanableItems = useMemo(
    () => (scan ? scan.items.filter((i) => i.cleanable !== false) : []),
    [scan]
  )
  const selected = selectedIds ?? new Set<string>()
  const selectedItems = cleanableItems.filter((i) => selected.has(i.id))
  const selectedBytes = selectedItems.reduce((sum, i) => sum + i.bytes, 0)
  const allSelected = cleanableItems.length > 0 && selected.size === cleanableItems.length
  const someSelected = selected.size > 0 && !allSelected

  const handleClean = async () => {
    setPreviewOpen(false)
    const ids = selectedItems.map((i) => i.id)
    if (ids.length === 0) return
    try {
      const result = await cleanCategory(category.id, ids)
      clear(category.id)
      toast.success(`Liberado ${formatBytes(result.freedBytes)}`, {
        description: `${result.successCount} de ${ids.length} itens enviados para a Lixeira${result.failed.length ? ` · ${result.failed.length} falharam` : ''}`,
      })
    } catch (err) {
      toast.error('Falha ao limpar', {
        description: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="drag-region flex items-center justify-between px-8 pb-6 pt-16">
        <div className="no-drag flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={closeCategory} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{category.label}</h1>
              <SafetyBadge tier={category.tier} />
            </div>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <div className="no-drag">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runScan(category.id)}
            disabled={loading || cleaning}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reescanear
          </Button>
        </div>
      </header>

      <main className="scrollbar-thin flex-1 overflow-y-auto px-8">
        <div className="mx-auto max-w-4xl space-y-6 pb-4">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{TIER_EXPLANATION[category.tier]}</p>
          </div>

          {!scan ? (
            <EmptyState onScan={() => runScan(category.id)} loading={loading} />
          ) : scan.items.length === 0 ? (
            <NothingFound />
          ) : (
            <ItemTable
              scan={scan}
              cleanableItems={cleanableItems}
              isSelected={(id) => selected.has(id)}
              onToggle={(id) => toggle(category.id, id)}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={() =>
                allSelected
                  ? clear(category.id)
                  : setAll(
                      category.id,
                      cleanableItems.map((i) => i.id)
                    )
              }
            />
          )}
        </div>
      </main>

      {scan && cleanableItems.length > 0 && (
        <CleanupBar
          selectedCount={selectedItems.length}
          selectedBytes={selectedBytes}
          cleaning={cleaning}
          onClear={() => clear(category.id)}
          onPreview={() => setPreviewOpen(true)}
        />
      )}

      <PreviewDialog
        open={previewOpen}
        items={selectedItems}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleClean}
      />
    </div>
  )
}

function EmptyState({ onScan, loading }: { onScan: () => void; loading: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
      <p className="text-sm text-muted-foreground">Ainda não escaneado.</p>
      <Button className="mt-4" onClick={onScan} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Escaneando
          </>
        ) : (
          'Escanear agora'
        )}
      </Button>
    </div>
  )
}

function NothingFound() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 p-10 text-center">
      <p className="text-sm text-muted-foreground">Nada encontrado nesta categoria.</p>
    </div>
  )
}

type ItemTableProps = {
  scan: ScanResult
  cleanableItems: ScanItem[]
  isSelected: (id: string) => boolean
  onToggle: (id: string) => void
  allSelected: boolean
  someSelected: boolean
  onToggleAll: () => void
}

function ItemTable({
  scan,
  cleanableItems,
  isSelected,
  onToggle,
  allSelected,
  someSelected,
  onToggleAll,
}: ItemTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
      <table className="w-full text-sm">
        <thead className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">
              <Checkbox
                aria-label="Selecionar todos"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={onToggleAll}
                disabled={cleanableItems.length === 0}
              />
            </th>
            <th className="px-4 py-3 text-left font-medium">Item</th>
            <th className="px-4 py-3 text-left font-medium">Caminho</th>
            <th className="px-4 py-3 text-right font-medium">Tamanho</th>
          </tr>
        </thead>
        <tbody>
          {scan.items.map((item) => {
            const disabled = item.cleanable === false
            const checked = disabled ? false : isSelected(item.id)
            return (
              <tr
                key={item.id}
                className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <Checkbox
                    aria-label={`Selecionar ${item.label}`}
                    checked={checked}
                    onCheckedChange={() => !disabled && onToggle(item.id)}
                    disabled={disabled}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{item.label}</div>
                  {item.note && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.note}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.path}</td>
                <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                  {formatBytes(item.bytes)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t border-border/60 bg-muted/30">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-sm text-muted-foreground">
              Total · escaneado {formatDate(scan.scannedAt)}
            </td>
            <td className="px-4 py-3 text-right font-mono text-base font-semibold tabular-nums">
              {formatBytes(scan.totalBytes)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
