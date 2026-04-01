import { Badge } from '@/components/ui/badge'
import type { DealStatus } from '@/app/dashboard/deals/types'

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

  const variant =
    s === 'won'
      ? 'default'
      : s === 'lost' || s === 'withdrawn'
        ? 'destructive'
        : s === 'archived'
          ? 'outline'
          : 'outline'

  return (
    <Badge className={className} variant={variant}>
      {label}
    </Badge>
  )
}

