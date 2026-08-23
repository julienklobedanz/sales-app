import { Badge } from '@/components/ui/badge'
import type { DealStatus } from '@/app/(app)/deals/types'
import { statusTone } from '@/lib/ui/status-tone'
import { cn } from '@/lib/utils'

type Props = {
  status: DealStatus | string | null | undefined
  className?: string
}

function normalize(raw: DealStatus | string | null | undefined): DealStatus {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'open') return 'open'
  if (s === 'rfp') return 'rfp'
  if (s === 'negotiation') return 'negotiation'
  if (s === 'won') return 'won'
  if (s === 'lost') return 'lost'
  if (s === 'withdrawn') return 'withdrawn'
  if (s === 'archived') return 'archived'
  return 'open'
}

const DEAL_TONE: Record<DealStatus, string> = {
  open: statusTone.info,
  rfp: statusTone.info,
  negotiation: statusTone.warning,
  won: statusTone.success,
  lost: statusTone.danger,
  withdrawn: statusTone.danger,
  archived: statusTone.neutral,
}

export function dealStatusTone(status: DealStatus): string {
  return DEAL_TONE[status]
}

export function DealStatusBadge({ status, className }: Props) {
  const s = normalize(status)

  const label =
    s === 'open'
      ? 'Offen'
      : s === 'rfp'
        ? 'RFP'
        : s === 'negotiation'
          ? 'Verhandlung'
          : s === 'won'
            ? 'Gewonnen'
            : s === 'lost'
              ? 'Verloren'
              : s === 'withdrawn'
                ? 'Zurückgezogen'
                : 'Archiviert'

  return (
    <Badge className={cn(dealStatusTone(s), className)} variant="outline">
      {label}
    </Badge>
  )
}
