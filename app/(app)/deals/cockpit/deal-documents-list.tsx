'use client'

import { COPY } from '@/lib/copy'
import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'

import type { DealDocumentRow as DealDocumentRowType } from '../document-actions'
import { DealDocumentRow } from './deal-document-row'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

export function DealDocumentsList({
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
  onAnalyzed,
}: {
  dealId: string
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
  onAnalyzed: () => void
}) {
  return (
    <>
      <ul className="divide-y divide-border pl-7">
        {documents.map((doc) => (
          <DealDocumentRow
            key={doc.id}
            doc={doc}
            canManage={canManage}
            isRfpMode={isRfpMode}
            analyzingId={analyzingId}
            downloadPendingId={downloadPendingId}
            onAnalyze={onAnalyze}
            onDownload={onDownload}
            onRenameRequest={onRenameRequest}
            onKindChange={onKindChange}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </ul>
      {isRfpMode && canManage ? (
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
