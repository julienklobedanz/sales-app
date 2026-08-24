'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import {
  getComplianceDocumentAccessUrls,
  updateComplianceDocument,
} from '@/app/(app)/settings/compliance-actions'
import { BulkDeleteComplianceDocumentsDialog } from '@/app/(app)/compliance/bulk-delete-compliance-documents-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { COPY } from '@/lib/copy'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'

export function ComplianceReadPane({
  document,
  canManage,
  onOpenNewVersion,
}: {
  document: ComplianceDocumentRow | null
  canManage: boolean
  onOpenNewVersion: () => void
}) {
  const router = useRouter()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [validUntilDraft, setValidUntilDraft] = useState('')
  const [savingValidUntil, setSavingValidUntil] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    setPreviewUrl(null)
    setDownloadUrl(null)
    setValidUntilDraft(document?.valid_until?.slice(0, 10) ?? '')
    if (!document?.file_storage_path) return
    let cancelled = false
    void getComplianceDocumentAccessUrls(document.id).then((result) => {
      if (cancelled || !result.success) return
      setPreviewUrl(result.urls.viewUrl)
      setDownloadUrl(result.urls.downloadUrl)
    })
    return () => {
      cancelled = true
    }
  }, [document])

  if (!document) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {COPY.compliance.paneEmpty}
      </div>
    )
  }

  async function handleSaveValidUntil() {
    if (!document) return
    setSavingValidUntil(true)
    try {
      const result = await updateComplianceDocument({
        documentId: document.id,
        title: document.title,
        validUntil: validUntilDraft.trim() || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      router.refresh()
    } finally {
      setSavingValidUntil(false)
    }
  }

  function handleDownload() {
    if (!downloadUrl) return
    const anchor = window.document.createElement('a')
    anchor.href = downloadUrl
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    window.document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <Card className="min-h-[12rem] gap-0 overflow-hidden bg-muted/20 p-0">
        {previewUrl ? (
          <iframe title={document.title} src={previewUrl} className="h-72 w-full" />
        ) : (
          <div className="flex h-72 items-center justify-center px-4 text-sm text-muted-foreground">
            {COPY.compliance.previewUnavailable}
          </div>
        )}
      </Card>

      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{COPY.compliance.documentTypeLabel}</dt>
          <dd className="font-medium">
            {complianceDocumentTypeLabel(document.document_type)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{COPY.compliance.validUntilLabel}</dt>
          <dd className="font-medium">
            {document.valid_until
              ? formatComplianceValidUntilDate(document.valid_until)
              : COPY.compliance.unlimited}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {canManage ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenNewVersion}>
            {COPY.compliance.actionNewVersion}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!downloadUrl}
          onClick={handleDownload}
        >
          {COPY.compliance.actionDownload}
        </Button>
      </div>

      {canManage ? (
        <Card className="gap-2 p-3">
          <p className="text-sm font-medium">{COPY.compliance.actionCorrectValidUntil}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={validUntilDraft}
              onChange={(event) => setValidUntilDraft(event.target.value)}
              aria-label={COPY.compliance.validUntilLabel}
              className="h-9 w-[11rem]"
            />
            <Button
              type="button"
              size="sm"
              disabled={savingValidUntil}
              onClick={() => void handleSaveValidUntil()}
            >
              {COPY.compliance.saveValidUntil}
            </Button>
          </div>
        </Card>
      ) : null}

      {canManage ? (
        <div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            {COPY.compliance.actionDelete}
          </Button>
          <BulkDeleteComplianceDocumentsDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            ids={[document.id]}
            loading={deleteLoading}
            onLoadingChange={setDeleteLoading}
            onSuccess={() => {
              setDeleteOpen(false)
              router.refresh()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
