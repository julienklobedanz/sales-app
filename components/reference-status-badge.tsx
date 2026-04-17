import { Badge } from '@/components/ui/badge'

type Props = {
  status: string | null | undefined
  /** Kunden-Freigabe-Link ausstehend (Epic 10) – hat Vorrang vor der Freigabestufe */
  customerApprovalStatus?: string | null
  className?: string
}

function normalizeStatus(raw: string | null | undefined) {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'approved' || s === 'external') return 'approved'
  if (s === 'internal_only' || s === 'internal') return 'internal_only'
  if (s === 'anonymized' || s === 'anonymous') return 'anonymized'
  if (s === 'pending') return 'pending'
  return 'draft'
}

export function ReferenceStatusBadge({
  status,
  customerApprovalStatus,
  className,
}: Props) {
  if (String(customerApprovalStatus ?? '').toLowerCase() === 'pending') {
    return (
      <Badge className={className} variant="secondary">
        Freigabe ausstehend
      </Badge>
    )
  }
  const s = normalizeStatus(status)
  if (s === 'approved')
    return (
      <Badge className={className} variant="default">
        Freigegeben
      </Badge>
    )
  if (s === 'internal_only')
    return (
      <Badge className={className} variant="secondary">
        Intern
      </Badge>
    )
  if (s === 'anonymized')
    return (
      <Badge className={className} variant="outline">
        Anonymisiert
      </Badge>
    )
  if (s === 'pending')
    return (
      <Badge className={className} variant="secondary">
        Freigabe ausstehend
      </Badge>
    )
  return (
    <Badge className={className} variant="outline">
      Entwurf
    </Badge>
  )
}

