'use client'

import { COPY } from '@/lib/copy'
import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'
import type { DocumentCardOwner } from '@/lib/deals/document-display'

import type { DealDocumentRow as DealDocumentRowType } from '../document-actions'
import { DealDocumentRow } from './deal-document-row'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

export function DealDocumentsList({
  owner,
  dealId,
  documents,
  canManage,
  isRfpMode,
  rfpHasAnalysis,
  rfpAnalysisStale,
  analyzingId,
  downloadPendingId,
  onAnalyze,
  onDownload,
  onRenameRequest,
  onKindChange,
  onDeleteRequest,
  onAssignToTender,
  onAssignToDeal,
  onAnalyzed,
}: {
  owner: DocumentCardOwner
  dealId: string | null
  documents: DealDocumentRowType[]
  canManage: boolean
  isRfpMode: boolean
  rfpHasAnalysis: boolean
  rfpAnalysisStale: boolean
  analyzingId: string | null
  downloadPendingId: string | null
  onAnalyze: (doc: DealDocumentRowType) => void
  onDownload: (doc: DealDocumentRowType) => void
  onRenameRequest: (doc: DealDocumentRowType) => void
  onKindChange: (doc: DealDocumentRowType, kind: DealDocumentKind) => void
  onDeleteRequest: (doc: DealDocumentRowType) => void
  onAssignToTender: (doc: DealDocumentRowType) => void
  onAssignToDeal: (doc: DealDocumentRowType, dealId: string) => void
  onAnalyzed: () => void
}) {
  return (
    <>
      <ul className="divide-y divide-border pl-7">
        {documents.map((doc) => (
          <DealDocumentRow
            key={doc.id}
            doc={doc}
            owner={owner}
            canManage={canManage}
            isRfpMode={isRfpMode}
            analyzingId={analyzingId}
            downloadPendingId={downloadPendingId}
            onAnalyze={onAnalyze}
            onDownload={onDownload}
            onRenameRequest={onRenameRequest}
            onKindChange={onKindChange}
            onDeleteRequest={onDeleteRequest}
            onAssignToTender={onAssignToTender}
            onAssignToDeal={onAssignToDeal}
          />
        ))}
      </ul>
      {isRfpMode && canManage && dealId ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 pl-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {COPY.deals.cockpit.documentsAnalyzeReadyHint}
          </p>
          <DealRfpAnalyzeButton
            dealId={dealId}
            documents={documents}
            canManage={canManage}
            hasAnalysis={rfpHasAnalysis}
            isStale={rfpAnalysisStale}
            variant="default"
            className="shrink-0"
            onAnalyzed={onAnalyzed}
          />
        </div>
      ) : null}
    </>
  )
}
