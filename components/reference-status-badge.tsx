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
  const softBadgeClass = 'border-0 font-medium shadow-none'
  if (String(customerApprovalStatus ?? '').toLowerCase() === 'pending') {
    return (
      <Badge className={`${softBadgeClass} bg-slate-100/70 text-slate-600 ${className ?? ''}`} variant="secondary">
        Freigabe ausstehend
      </Badge>
    )
  }
  const s = normalizeStatus(status)
  if (s === 'approved')
    return (
      <Badge className={`${softBadgeClass} bg-blue-400/10 text-blue-600 ${className ?? ''}`} variant="default">
        Freigegeben
      </Badge>
    )
  if (s === 'internal_only')
    return (
      <Badge className={`${softBadgeClass} bg-slate-100/70 text-slate-600 ${className ?? ''}`} variant="secondary">
        Intern
      </Badge>
    )
  if (s === 'anonymized')
    return (
      <Badge className={`${softBadgeClass} bg-slate-100/70 text-slate-700 ${className ?? ''}`} variant="outline">
        Anonymisiert
      </Badge>
    )
  if (s === 'pending')
    return (
      <Badge className={`${softBadgeClass} bg-slate-100/70 text-slate-600 ${className ?? ''}`} variant="secondary">
        Freigabe ausstehend
      </Badge>
    )
  return (
    <Badge className={`${softBadgeClass} bg-slate-100/70 text-slate-700 ${className ?? ''}`} variant="outline">
      Entwurf
    </Badge>
  )
}

