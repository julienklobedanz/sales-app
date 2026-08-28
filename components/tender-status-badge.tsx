import { Badge } from '@/components/ui/badge'
import { statusTone } from '@/lib/ui/status-tone'
import { cn } from '@/lib/utils'
import type { DerivedTenderStatus } from '@/lib/tenders/derive-tender-status'
import { formatTenderStatusLabel } from '@/lib/tenders/tender-status-label'

const TONE: Record<DerivedTenderStatus['kind'], string> = {
  running: statusTone.info,
  won: statusTone.success,
  lost: statusTone.danger,
  partially_won: statusTone.warning,
  empty: statusTone.neutral,
}

export function TenderStatusBadge({
  status,
  className,
}: {
  status: DerivedTenderStatus
  className?: string
}) {
  return (
    <Badge className={cn(TONE[status.kind], className)} variant="outline">
      {formatTenderStatusLabel(status)}
    </Badge>
  )
}
