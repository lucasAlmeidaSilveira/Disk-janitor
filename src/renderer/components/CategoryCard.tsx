import {
  AppWindow,
  ChevronRight,
  Container,
  Download,
  FileSearch,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Terminal,
} from 'lucide-react'
import type { CategoryMeta, ScanResult } from '@shared/ipc-contract'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { SafetyBadge } from './SafetyBadge'
import { formatBytes, formatDate } from '@renderer/lib/format'

const ICONS = {
  globe: Globe,
  terminal: Terminal,
  container: Container,
  image: ImageIcon,
  layers: Layers,
  download: Download,
  app: AppWindow,
  file: FileSearch,
} as const

type CategoryCardProps = {
  category: CategoryMeta
  scan: ScanResult | undefined
  loading: boolean
  onScan: () => void
  onOpen: () => void
}

export function CategoryCard({ category, scan, loading, onScan, onOpen }: CategoryCardProps) {
  const Icon = ICONS[category.icon as keyof typeof ICONS] ?? Globe

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-colors hover:border-border">
      <CardHeader>
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/60">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <SafetyBadge tier={category.tier} />
        </div>
        <CardTitle>{category.label}</CardTitle>
        <CardDescription className="line-clamp-2">{category.description}</CardDescription>
      </CardHeader>

      <CardContent className="mt-auto">
        {scan ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {formatBytes(scan.totalBytes)}
              </p>
              <p className="text-xs text-muted-foreground">
                {scan.items.length} {scan.items.length === 1 ? 'item' : 'itens'} · escaneado{' '}
                {formatDate(scan.scannedAt)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onScan}
                disabled={loading}
                title="Reescanear"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={onOpen}>
                Ver
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Ainda não escaneado</p>
            <Button variant="secondary" size="sm" onClick={onScan} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Escaneando
                </>
              ) : (
                'Escanear'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
