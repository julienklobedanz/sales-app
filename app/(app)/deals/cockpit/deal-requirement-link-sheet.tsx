'use client'

import { useRouter } from 'next/navigation'

import { COPY } from '@/lib/copy'
import type { RequirementLinkPickDoc } from '@/lib/deals/requirement-link-types'

import { DealEvidenceLinkSheet } from './deal-evidence-link-sheet'
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

  return (
    <DealEvidenceLinkSheet
      open={open}
      onOpenChange={onOpenChange}
      title={COPY.deals.cockpit.requirementsLinkEvidence}
      description={requirementText}
      need={requirementText}
      pickDocs={pickDocs}
      linkedDocumentIds={linkedDocumentIds}
      successMessage={COPY.deals.cockpit.requirementsLinkSuccess}
      onLink={async (documentId) => {
        const result = await linkDealRequirementDocument({
          dealId,
          requirementId,
          documentId,
        })
        if (result.success) router.refresh()
        return result
      }}
    />
  )
}
