'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight01Icon, CirclePlus } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'
import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'

import type { DealDocumentRow } from '../document-actions'
import {
  deleteDealDocument,
  getDealDocumentSignedUrl,
  renameDealDocument,
  setDealDocumentKind,
  uploadDealDocument,
} from '../document-actions'
import { DealDocumentDeleteDialog } from './deal-document-delete-dialog'
import { DealDocumentRenameDialog } from './deal-document-rename-dialog'
import { DealDocumentUploadDialog } from './deal-document-upload-dialog'
import { DealDocumentsList } from './deal-documents-list'
import { runDealRfpAnalyze } from './deal-rfp-analyze-button'
import { useDealReferenceSuggestionsRefresh } from './deal-reference-suggestions-refresh'

export function DealDocumentsSection({
  dealId,
  documents: initialDocuments,
  canManage,
  isRfpMode = false,
  rfpHasAnalysis = false,
  rfpAnalysisStale = false,
  forceExpanded = false,
}: {
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
  isRfpMode?: boolean
  rfpHasAnalysis?: boolean
  rfpAnalysisStale?: boolean
  forceExpanded?: boolean
}) {
  const router = useRouter()
  const refreshReferenceSuggestions = useDealReferenceSuggestionsRefresh()
  const [documents, setDocuments] = useState(initialDocuments)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadKind, setUploadKind] = useState<DealDocumentKind>(
    isRfpMode ? 'ausschreibung' : 'sonstiges',
  )
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DealDocumentRow | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamePending, setRenamePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DealDocumentRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(
    () =>
      forceExpanded ||
      (isRfpMode && initialDocuments.length > 0 && !rfpHasAnalysis),
  )

  async function handleUpload() {
    if (!uploadFile) {
      toast.error('Bitte eine Datei wählen.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', uploadFile)
      formData.set('kind', uploadKind)
      const res = await uploadDealDocument(dealId, formData)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Dokument hochgeladen.')
      setUploadOpen(false)
      setUploadFile(null)
      setUploadKind(isRfpMode ? 'ausschreibung' : 'sonstiges')
      if (isRfpMode) {
        toast.message(COPY.deals.cockpit.documentsAnalyzeWhenReady)
      }
      void refreshReferenceSuggestions?.()
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleAnalyze(doc: DealDocumentRow) {
    setAnalyzingId(doc.id)
    try {
      const result = await runDealRfpAnalyze(dealId, doc)
      if (!result.success) {
        toast.error(result.error ?? COPY.deals.cockpit.documentsAnalyzeFailed)
        return
      }
      toast.success(COPY.deals.cockpit.documentsAnalyzeSuccess)
      void refreshReferenceSuggestions?.()
      router.refresh()
    } catch {
      toast.error(COPY.deals.cockpit.documentsAnalyzeFailed)
    } finally {
      setAnalyzingId(null)
    }
  }

  async function handleDownload(doc: DealDocumentRow) {
    setDownloadPendingId(doc.id)
    try {
      const res = await getDealDocumentSignedUrl(doc.id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadPendingId(null)
    }
  }

  async function handleRename() {
    if (!renameTarget) return
    setRenamePending(true)
    try {
      const res = await renameDealDocument(renameTarget.id, renameValue)
      if (!res.success) {
        toast.error(res.error ?? 'Umbenennen fehlgeschlagen.')
        return
      }
      toast.success('Dateiname aktualisiert.')
      setRenameTarget(null)
      router.refresh()
    } finally {
      setRenamePending(false)
    }
  }

  async function handleKindChange(doc: DealDocumentRow, kind: DealDocumentKind) {
    const res = await setDealDocumentKind(doc.id, kind)
    if (!res.success) {
      toast.error(res.error ?? 'Typ konnte nicht geändert werden.')
      return
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, kind } : d)))
    toast.success('Dokumenttyp aktualisiert.')
    if (doc.kind === 'ausschreibung' && kind !== 'ausschreibung') {
      toast.info(COPY.deals.cockpit.documentsKindChangeAnalysisHint)
    }
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      const res = await deleteDealDocument(deleteTarget.id)
      if (!res.success) {
        toast.error(res.error ?? 'Löschen fehlgeschlagen.')
        return
      }
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      toast.success('Dokument gelöscht.')
      setDeleteTarget(null)
      router.refresh()
    } finally {
      setDeletePending(false)
    }
  }

  const title = `${COPY.deals.cockpit.documentsTitle} · ${documents.length}`
  const list =
    documents.length === 0 ? (
      <CardContent className="pt-0">
        <p
          className={cn(
            'text-sm text-muted-foreground',
            !forceExpanded && 'pl-7',
          )}
        >
          {COPY.deals.cockpit.documentsEmpty}
        </p>
      </CardContent>
    ) : (
      <CardContent className="pt-0">
        <DealDocumentsList
          dealId={dealId}
          documents={documents}
          canManage={canManage}
          isRfpMode={isRfpMode}
          rfpHasAnalysis={rfpHasAnalysis}
          rfpAnalysisStale={rfpAnalysisStale}
          analyzingId={analyzingId}
          downloadPendingId={downloadPendingId}
          onAnalyze={(doc) => void handleAnalyze(doc)}
          onDownload={(doc) => void handleDownload(doc)}
          onRenameRequest={(doc) => {
            setRenameTarget(doc)
            setRenameValue(doc.file_name)
          }}
          onKindChange={(doc, kind) => void handleKindChange(doc, kind)}
          onDeleteRequest={setDeleteTarget}
          onAnalyzed={() => void refreshReferenceSuggestions?.()}
        />
      </CardContent>
    )

  return (
    <>
      <Card id="dokumente" className="mb-6 scroll-mt-24">
        {forceExpanded ? (
          <>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                >
                  <AppIcon icon={CirclePlus} size={16} className="mr-1" />
                  {COPY.deals.cockpit.documentsUpload}
                </Button>
              ) : null}
            </CardHeader>
            {list}
          </>
        ) : (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <AppIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    className={cn(
                      'shrink-0 text-muted-foreground transition-transform',
                      expanded && 'rotate-90',
                    )}
                  />
                  <CardTitle className="text-base">{title}</CardTitle>
                </button>
              </CollapsibleTrigger>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                >
                  <AppIcon icon={CirclePlus} size={16} className="mr-1" />
                  {COPY.deals.cockpit.documentsUpload}
                </Button>
              ) : null}
            </CardHeader>
            {documents.length === 0 ? list : <CollapsibleContent>{list}</CollapsibleContent>}
          </Collapsible>
        )}
      </Card>

      <DealDocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        kind={uploadKind}
        onKindChange={setUploadKind}
        file={uploadFile}
        onFileChange={setUploadFile}
        uploading={uploading}
        onSubmit={() => void handleUpload()}
      />

      <DealDocumentRenameDialog
        open={renameTarget != null}
        value={renameValue}
        pending={renamePending}
        onValueChange={setRenameValue}
        onClose={() => setRenameTarget(null)}
        onSubmit={() => void handleRename()}
      />

      <DealDocumentDeleteDialog
        open={deleteTarget != null}
        fileName={deleteTarget?.file_name ?? ''}
        pending={deletePending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
