'use client'

import { useCallback, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  extractComplianceCertificateMetadataFromPdf,
  uploadComplianceDocumentsBatch,
} from '@/app/dashboard/settings/compliance-actions'
import { listComplianceDocumentTypeOptions } from '@/app/dashboard/settings/compliance-document-type-actions'
import { ComplianceDocumentTypeCombobox } from '@/app/dashboard/overview/compliance-document-type-combobox'
import { ComplianceDocumentTypesDialog } from '@/app/dashboard/overview/compliance-document-types-dialog'
import { ComplianceMultiPdfDropzone } from '@/app/dashboard/overview/compliance-multi-pdf-dropzone'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getSystemComplianceDocumentTypes,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'
import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { buildDefaultComplianceTitle } from '@/lib/compliance/upload-filename'
import { cn } from '@/lib/utils'

type BulkRow = {
  id: string
  file: File
  documentType: string
  title: string
  validUntil: string
  titleManuallyEdited: boolean
  validUntilManuallyEdited: boolean
  typeManuallyEdited: boolean
  extracting: boolean
  expiryAutoFilled: boolean
  typeAutoFilled: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function createBulkRow(
  file: File,
  typeOptions: ComplianceDocumentTypeOption[]
): BulkRow {
  const inferredType =
    inferComplianceDocumentTypeFromUpload({ title: '', fileName: file.name }) ?? 'iso_27001'
  return {
    id: crypto.randomUUID(),
    file,
    documentType: inferredType,
    title: buildDefaultComplianceTitle(inferredType, typeOptions),
    validUntil: '',
    titleManuallyEdited: false,
    validUntilManuallyEdited: false,
    typeManuallyEdited: false,
    extracting: true,
    expiryAutoFilled: false,
    typeAutoFilled: Boolean(inferredType),
  }
}

export function ComplianceBulkUploadDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'drop' | 'review'>('drop')
  const [rows, setRows] = useState<BulkRow[]>([])
  const [typeOptions, setTypeOptions] = useState<ComplianceDocumentTypeOption[]>(() =>
    getSystemComplianceDocumentTypes()
  )
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadTypes = useCallback(async () => {
    setTypesLoading(true)
    const result = await listComplianceDocumentTypeOptions()
    setTypesLoading(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypeOptions(result.types)
  }, [])

  const enrichRowFromPdf = useCallback(
    async (rowId: string, file: File, options: ComplianceDocumentTypeOption[]) => {
      const formData = new FormData()
      formData.set('file', file)
      const result = await extractComplianceCertificateMetadataFromPdf(formData)

      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row

          let next = { ...row, extracting: false }
          if (!result.success) return next

          if (!row.typeManuallyEdited && result.documentType) {
            next = {
              ...next,
              documentType: result.documentType,
              typeAutoFilled: true,
              title: row.titleManuallyEdited
                ? row.title
                : buildDefaultComplianceTitle(result.documentType, options),
            }
          }

          if (
            !row.validUntilManuallyEdited &&
            result.validUntil &&
            result.expiryConfidence !== 'none'
          ) {
            next = {
              ...next,
              validUntil: result.validUntil,
              expiryAutoFilled: true,
            }
          }

          return next
        })
      )
    },
    []
  )

  function reset() {
    setStep('drop')
    setRows([])
    setTypeOptions(getSystemComplianceDocumentTypes())
  }

  function handleFilesSelected(files: File[]) {
    const newRows = files.map((file) => createBulkRow(file, typeOptions))
    setRows((prev) => [...prev, ...newRows])
    setStep('review')
    for (const row of newRows) {
      void enrichRowFromPdf(row.id, row.file, typeOptions)
    }
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id)
      if (next.length === 0) setStep('drop')
      return next
    })
  }

  function handleDocumentTypeChange(id: string, slug: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        return {
          ...row,
          documentType: slug,
          typeManuallyEdited: true,
          typeAutoFilled: false,
          title: row.titleManuallyEdited
            ? row.title
            : buildDefaultComplianceTitle(slug, typeOptions),
        }
      })
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rows.length) {
      toast.error('Bitte mindestens eine PDF-Datei auswählen.')
      return
    }
    if (rows.some((row) => row.extracting)) {
      toast.error('Bitte warten, bis alle PDFs analysiert wurden.')
      return
    }

    const invalid = rows.find((row) => !row.title.trim())
    if (invalid) {
      toast.error('Jedes Zertifikat braucht einen Titel.')
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.set(
      'manifest',
      JSON.stringify(
        rows.map((row, index) => ({
          title: row.title.trim(),
          documentType: row.documentType,
          validUntil: row.validUntil.trim() || null,
          fileIndex: index,
        }))
      )
    )
    rows.forEach((row, index) => {
      formData.set(`file_${index}`, row.file)
    })

    const result = await uploadComplianceDocumentsBatch(formData)
    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    if (result.errors.length > 0) {
      toast.error(`${result.uploaded} gespeichert, ${result.errors.length} Fehler.`)
      console.error(result.errors)
    } else {
      toast.success(
        `${result.uploaded} Zertifikat${result.uploaded !== 1 ? 'e' : ''} gespeichert.`
      )
    }

    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) void loadTypes()
          else reset()
          onOpenChange(next)
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,52rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4">
              <DialogTitle className="text-xl">Zertifikate importieren</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {step === 'drop'
                  ? 'Schritt 1: PDFs per Drag & Drop auswählen'
                  : `${rows.length} Zertifikat${rows.length !== 1 ? 'e' : ''} — Typ, Titel und Gültigkeit prüfen`}
              </p>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {step === 'drop' ? (
                <ComplianceMultiPdfDropzone
                  onFilesSelected={handleFilesSelected}
                  disabled={saving || typesLoading}
                />
              ) : (
                <div className="space-y-4">
                  <ComplianceMultiPdfDropzone
                    id="compliance-bulk-pdf-dropzone-more"
                    onFilesSelected={handleFilesSelected}
                    disabled={saving || typesLoading}
                  />

                  <div className="space-y-3">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="relative rounded-lg border border-border/80 bg-card p-4 shadow-sm"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 size-8 text-muted-foreground"
                          onClick={() => removeRow(row.id)}
                          disabled={saving}
                          aria-label="Entfernen"
                        >
                          <X className="size-4" />
                        </Button>

                        <p className="mb-3 max-w-[calc(100%-2.5rem)] truncate text-sm font-medium text-foreground">
                          {row.file.name}
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Dokumenttyp</Label>
                            <ComplianceDocumentTypeCombobox
                              options={typeOptions}
                              value={row.documentType}
                              onValueChange={(slug) => handleDocumentTypeChange(row.id, slug)}
                              onOptionsChange={setTypeOptions}
                              disabled={saving || row.extracting || typesLoading}
                              onManageTypesClick={() => setTypesDialogOpen(true)}
                            />
                            {row.typeAutoFilled && !row.typeManuallyEdited ? (
                              <p className="text-xs text-muted-foreground">
                                Dokumenttyp automatisch erkannt.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <Label>Titel</Label>
                            <Input
                              value={row.title}
                              onChange={(e) =>
                                updateRow(row.id, {
                                  title: e.target.value,
                                  titleManuallyEdited: true,
                                })
                              }
                              disabled={saving || row.extracting}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Gültig bis (optional)</Label>
                            <div className="relative">
                              <Input
                                type="date"
                                value={row.validUntil}
                                onChange={(e) =>
                                  updateRow(row.id, {
                                    validUntil: e.target.value,
                                    validUntilManuallyEdited: true,
                                    expiryAutoFilled: false,
                                  })
                                }
                                disabled={saving || row.extracting}
                                className={row.extracting ? 'pr-10' : undefined}
                              />
                              {row.extracting ? (
                                <Loader2
                                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            {row.extracting ? (
                              <p className="text-xs text-muted-foreground">PDF wird analysiert…</p>
                            ) : row.expiryAutoFilled && row.validUntil ? (
                              <p className="text-xs text-muted-foreground">
                                Ablaufdatum automatisch übernommen.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className={cn('shrink-0 border-t px-6 py-4')}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Abbrechen
              </Button>
              {step === 'review' ? (
                <Button
                  type="submit"
                  disabled={saving || rows.length === 0 || rows.some((r) => r.extracting)}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Speichern…
                    </>
                  ) : (
                    `${rows.length} Zertifikat${rows.length !== 1 ? 'e' : ''} speichern`
                  )}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ComplianceDocumentTypesDialog
        open={typesDialogOpen}
        onOpenChange={setTypesDialogOpen}
        onTypesChange={setTypeOptions}
      />
    </>
  )
}
