import { resolveReferenceTitleBadge } from '@/lib/references/reference-approval-display'
import { cn } from '@/lib/utils'

type Props = {
  status: string | null | undefined
  customerApprovalStatus?: string | null
  approvalInternalStatus?: string | null
  approvalRequestedAt?: string | null
  className?: string
}

const pill =
  'inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'

const darkVariants: Record<string, string> = {
  Widerrufen:
    'dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
  Gesperrt: 'dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  Abgelehnt: 'dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  'Intern abgelehnt': 'dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  'Frist abgelaufen': 'dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-100',
  'Freigabe ausstehend':
    'dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100',
  Freigegeben: 'dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200',
  'Interne Prüfung ausstehend':
    'dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100',
  'Intern freigegeben':
    'dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100',
  Intern: 'dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
  Anonymisiert: 'dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100',
  Entwurf: 'dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100',
}

export function ReferenceStatusBadge({
  status,
  customerApprovalStatus,
  approvalInternalStatus,
  approvalRequestedAt,
  className,
}: Props) {
  const badge = resolveReferenceTitleBadge({
    referenceStatus: status,
    customerApprovalStatus,
    internalApprovalStatus: approvalInternalStatus,
    approvalRequestedAt,
  })

  return (
    <span
      className={cn(pill, badge.className, darkVariants[badge.label], className)}
      role="status"
    >
      {badge.label}
    </span>
  )
}
