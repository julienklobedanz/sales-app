import { Badge } from '@/components/ui/badge'

type TicketStatus = 'open' | 'closed' | string

type Props = {
  status: TicketStatus | null | undefined
  className?: string
}

function normalize(status: TicketStatus | null | undefined): 'open' | 'closed' {
  const s = String(status ?? '').toLowerCase()
  if (s === 'open') return 'open'
  if (s === 'closed') return 'closed'
  return 'open'
}

export function TicketStatusBadge({ status, className }: Props) {
  const s = normalize(status)
  if (s === 'open') {
    return (
      <Badge className={className} variant="secondary">
        Offen
      </Badge>
    )
  }
  return (
    <Badge className={className} variant="default">
      Geschlossen
    </Badge>
  )
}

