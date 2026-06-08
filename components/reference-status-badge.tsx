import { cn } from '@/lib/utils'

type Props = {
  status: string | null | undefined
  /** Kunden-Freigabe-Link ausstehend (Epic 10) – hat Vorrang vor der Freigabestufe */
  customerApprovalStatus?: string | null
  approvalInternalStatus?: string | null
  className?: string
}

const pill =
  'inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'

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
  approvalInternalStatus,
  className,
}: Props) {
  if (String(approvalInternalStatus ?? '').toLowerCase() === 'withdrawn_internal') {
    return (
      <span
        className={cn(
          pill,
          'border-slate-200 bg-slate-100/90 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
          className
        )}
        role="status"
      >
        Widerrufen
      </span>
    )
  }
  if (String(customerApprovalStatus ?? '').toLowerCase() === 'pending') {
    return (
      <span
        className={cn(
          pill,
          'border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
          className
        )}
        role="status"
      >
        Freigabe ausstehend
      </span>
    )
  }
  const s = normalizeStatus(status)
  if (s === 'approved')
    return (
      <span
        className={cn(
          pill,
          'border-blue-200 bg-blue-500/10 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200',
          className
        )}
        role="status"
      >
        Freigegeben
      </span>
    )
  if (s === 'internal_only')
    return (
      <span
        className={cn(
          pill,
          'border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
          className
        )}
        role="status"
      >
        Intern
      </span>
    )
  if (s === 'anonymized')
    return (
      <span
        className={cn(
          pill,
          'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100',
          className
        )}
        role="status"
      >
        Anonymisiert
      </span>
    )
  if (s === 'pending')
    return (
      <span
        className={cn(
          pill,
          'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100',
          className
        )}
        role="status"
      >
        Freigabe ausstehend
      </span>
    )
  return (
    <span
      className={cn(pill, 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100', className)}
      role="status"
    >
      Entwurf
    </span>
  )
}

