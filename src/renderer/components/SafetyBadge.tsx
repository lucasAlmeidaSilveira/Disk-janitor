import { AlertTriangle, Eye, ShieldCheck } from 'lucide-react'
import type { SafetyTier } from '@shared/ipc-contract'
import { Badge } from './ui/badge'

const CONFIG: Record<SafetyTier, { label: string; icon: typeof ShieldCheck; variant: 'safe' | 'caution' | 'review' }> = {
  safe: { label: 'Seguro', icon: ShieldCheck, variant: 'safe' },
  caution: { label: 'Cuidado', icon: AlertTriangle, variant: 'caution' },
  review: { label: 'Revisar', icon: Eye, variant: 'review' },
}

export function SafetyBadge({ tier }: { tier: SafetyTier }) {
  const { label, icon: Icon, variant } = CONFIG[tier]
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </Badge>
  )
}
