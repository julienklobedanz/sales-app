'use client'

import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { ReferenceStatusBadge } from '@/components/reference-status-badge'
import { AppIcon } from '@/lib/icons'
import { getReferenceStatusExplanation } from '@/lib/references/reference-status-explanation'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ReferenceStatusWithHint({
  status,
  customerApprovalStatus,
  approvalInternalStatus,
  approvalRequestedAt,
  className,
}: {
  status: string | null | undefined
  customerApprovalStatus?: string | null
  approvalInternalStatus?: string | null
  approvalRequestedAt?: string | null
  className?: string
}) {
  const explanation = getReferenceStatusExplanation(
    status,
    customerApprovalStatus,
    approvalInternalStatus,
    approvalRequestedAt
  )
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <ReferenceStatusBadge
        status={status}
        customerApprovalStatus={customerApprovalStatus}
        approvalInternalStatus={approvalInternalStatus}
        approvalRequestedAt={approvalRequestedAt}
      />
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Was bedeutet dieser Status?"
            >
              <AppIcon icon={InformationCircleIcon} size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs leading-snug">
            {explanation}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
