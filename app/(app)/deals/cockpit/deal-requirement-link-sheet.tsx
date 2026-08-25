'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { COPY } from '@/lib/copy'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'
import { sortComplianceDocsForRequirementLink } from '@/lib/deals/sort-compliance-docs-for-requirement-link'
import type { RequirementLinkPickDoc } from '@/lib/deals/requirement-link-types'
import { cn } from '@/lib/utils'

import { linkDealRequirementDocument } from './deal-requirement-document-actions'

export function DealRequirementLinkSheet({
  open,
  onOpenChange,
  dealId,
  requirementId,
  requirementText,
  pickDocs,
  linkedDocumentIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  requirementId: string
  requirementText: string
  pickDocs: RequirementLinkPickDoc[]
  linkedDocumentIds: ReadonlySet<string>
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const items = useMemo(
    () =>
      sortComplianceDocsForRequirementLink({
        docs: pickDocs,
        need: requirementText,
        linkedDocumentIds,
      }),
    [pickDocs, requirementText, linkedDocumentIds],
  )

  async function handleLink(documentId: string) {
    setPendingId(documentId)
    try {
      const result = await linkDealRequirementDocument({
        dealId,
        requirementId,
        documentId,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(COPY.deals.cockpit.requirementsLinkSuccess)
      onOpenChange(false)
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{COPY.deals.cockpit.requirementsLinkEvidence}</SheetTitle>
          <SheetDescription className="line-clamp-3">{requirementText}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {COPY.deals.cockpit.requirementsLinkSheetEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    disabled={pendingId != null}
                    onClick={() => void handleLink(doc.id)}
                    className={cn(
                      'flex w-full flex-col items-start gap-1 py-3 text-left transition-colors hover:bg-muted/40',
                      pendingId === doc.id && 'opacity-60',
                    )}
                  >
                    <div className="flex w-full flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {doc.title}
                      </span>
                      {doc.suggested ? (
                        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                          {COPY.deals.cockpit.requirementsLinkSuggestion}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {complianceDocumentTypeLabel(doc.documentType)}
                      {' · '}
                      {doc.validUntil
                        ? formatComplianceValidUntilDate(doc.validUntil)
                        : COPY.compliance.unlimited}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
