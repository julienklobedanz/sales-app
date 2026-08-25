'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { complianceValidityStatus } from '@/lib/compliance/expiry'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'
import type { DealRfpRequirementRow } from '@/lib/deals/load-deal-rfp-requirements'
import type {
  RequirementLinkPickDoc,
  RequirementLinkedDocument,
} from '@/lib/deals/requirement-link-types'
import { cn } from '@/lib/utils'
import { statusToneText } from '@/lib/ui/status-tone'

import { DealEntryPanel } from './deal-entry-panel'
import { unlinkDealRequirementDocument } from './deal-requirement-document-actions'
import { DealRequirementLinkSheet } from './deal-requirement-link-sheet'

export function DealRequirementsEntryPanel({
  dealId,
  canManageDocuments,
  requirements,
  linkedDocuments,
  pickDocs,
}: {
  dealId: string
  canManageDocuments: boolean
  requirements: DealRfpRequirementRow[]
  linkedDocuments: RequirementLinkedDocument[]
  pickDocs: RequirementLinkPickDoc[]
}) {
  const { selected } = useCollectionObjectSelection({
    items: requirements,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  return (
    <DealEntryPanel host="workspace">
      {!selected ? (
        <p className="text-sm text-muted-foreground">
          {COPY.deals.cockpit.entryPanelEmpty}
        </p>
      ) : (
        <RequirementEntryBody
          key={selected.id}
          dealId={dealId}
          canManageDocuments={canManageDocuments}
          requirement={selected}
          linkedDocuments={linkedDocuments}
          pickDocs={pickDocs}
        />
      )}
    </DealEntryPanel>
  )
}

function RequirementEntryBody({
  dealId,
  canManageDocuments,
  requirement,
  linkedDocuments,
  pickDocs,
}: {
  dealId: string
  canManageDocuments: boolean
  requirement: DealRfpRequirementRow
  linkedDocuments: RequirementLinkedDocument[]
  pickDocs: RequirementLinkPickDoc[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const linked = useMemo(
    () => linkedDocuments.filter((row) => row.requirementId === requirement.id),
    [linkedDocuments, requirement.id],
  )
  const linkedIds = useMemo(() => new Set(linked.map((row) => row.documentId)), [linked])

  async function handleUnlink(documentId: string) {
    setUnlinkingId(documentId)
    try {
      const result = await unlinkDealRequirementDocument({
        dealId,
        requirementId: requirement.id,
        documentId,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(COPY.deals.cockpit.requirementsUnlinkSuccess)
      router.refresh()
    } finally {
      setUnlinkingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {requirement.category ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {requirement.category}
        </p>
      ) : null}
      <h2 className="text-base font-semibold">{requirement.text}</h2>
      <p className="text-sm text-muted-foreground">
        {COPY.deals.cockpit.requirementsSource}:{' '}
        {requirement.sourceFileName ?? COPY.deals.cockpit.requirementsSourceUnknown}
      </p>

      <div className="space-y-2">
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {COPY.deals.cockpit.requirementsLinkedEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {linked.map((doc) => (
              <li
                key={doc.documentId}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {complianceDocumentTypeLabel(doc.documentType)}
                  </p>
                  <LinkedDocValidity validUntil={doc.validUntil} />
                </div>
                {canManageDocuments ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={unlinkingId != null}
                    onClick={() => void handleUnlink(doc.documentId)}
                  >
                    {COPY.deals.cockpit.requirementsUnlinkEvidence}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManageDocuments ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSheetOpen(true)}
          >
            {COPY.deals.cockpit.requirementsLinkEvidence}
          </Button>
        ) : null}
      </div>

      {canManageDocuments ? (
        <DealRequirementLinkSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          dealId={dealId}
          requirementId={requirement.id}
          requirementText={requirement.text}
          pickDocs={pickDocs}
          linkedDocumentIds={linkedIds}
        />
      ) : null}
    </div>
  )
}

function LinkedDocValidity({ validUntil }: { validUntil: string | null }) {
  const status = complianceValidityStatus(validUntil)
  const dateLabel = validUntil
    ? formatComplianceValidUntilDate(validUntil)
    : COPY.compliance.unlimited
  if (status === 'expired') {
    return (
      <p className={cn('mt-1 text-xs font-medium', statusToneText.danger)}>
        {COPY.compliance.statusExpired} · {dateLabel}
      </p>
    )
  }
  if (status === 'expiring') {
    return (
      <p className={cn('mt-1 text-xs font-medium', statusToneText.warning)}>
        {COPY.compliance.statusExpiring} · {dateLabel}
      </p>
    )
  }
  return <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
}
