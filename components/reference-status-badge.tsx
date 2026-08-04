import { resolveReferenceTitleBadge } from '@/lib/references/reference-approval-display'
import { cn } from '@/lib/utils'

type Props = {
  status: string | null | undefined
  customerApprovalStatus?: string | null
  approvalInternalStatus?: string | null
  approvalRequestedAt?: string | null
  approvalScopeNamedMention?: boolean | null
  approvalScopeAnonymousMention?: boolean | null
  className?: string
}

const pill =
  'inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'

const darkVariants: Record<string, string> = {
  Widerrufen: 'dark:border-border dark:bg-muted/40 dark:text-muted-foreground',
  Gesperrt: '',
  Abgelehnt: '',
  'Intern abgelehnt': '',
  'Frist abgelaufen': '',
  'Freigabe ausstehend': '',
  Freigegeben: '',
  'Extern freigegeben': '',
  'Interne Prüfung ausstehend': '',
  'Intern freigegeben': '',
  Intern: 'dark:border-border dark:bg-muted/40 dark:text-muted-foreground',
  Anonymisiert: 'dark:border-border dark:bg-muted/40 dark:text-foreground',
  Entwurf: 'dark:border-border dark:bg-muted/40 dark:text-foreground',
}

export function ReferenceStatusBadge({
  status,
  customerApprovalStatus,
  approvalInternalStatus,
  approvalRequestedAt,
  approvalScopeNamedMention,
  approvalScopeAnonymousMention,
  className,
}: Props) {
  const badge = resolveReferenceTitleBadge({
    referenceStatus: status,
    customerApprovalStatus,
    internalApprovalStatus: approvalInternalStatus,
    approvalRequestedAt,
    approvalScopeNamedMention,
    approvalScopeAnonymousMention,
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
