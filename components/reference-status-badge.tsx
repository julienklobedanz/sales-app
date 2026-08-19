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
      className={cn(pill, badge.className, className)}
      role="status"
    >
      {badge.label}
    </span>
  )
}
