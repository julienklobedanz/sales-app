'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  extractComplianceCertificateMetadataFromPdf,
  uploadComplianceDocument,
} from '@/app/dashboard/settings/compliance-actions'
import { listComplianceDocumentTypeOptions } from '@/app/dashboard/settings/compliance-document-type-actions'
import {
  NdaPdfDropzone,
  titleFromPdfFilename,
} from '@/app/dashboard/accounts/components/nda-pdf-dropzone'
import { ComplianceDocumentTypeCombobox } from '@/app/dashboard/overview/compliance-document-type-combobox'
import { ComplianceDocumentTypesDialog } from '@/app/dashboard/overview/compliance-document-types-dialog'
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComplianceUploadDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [documentType, setDocumentType] = useState('iso_27001')
  const [typeOptions, setTypeOptions] = useState<ComplianceDocumentTypeOption[]>(() =>
    getSystemComplianceDocumentTypes(),
  )
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [title, setTitle] = useState(() => buildDefaultComplianceTitle('iso_27001'))
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false)
  const [typeManuallyEdited, setTypeManuallyEdited] = useState(false)
  const [typeAutoFilled, setTypeAutoFilled] = useState(false)
  const [validUntil, setValidUntil] = useState('')
  const [validUntilManuallyEdited, setValidUntilManuallyEdited] = useState(false)
  const [expiryExtracting, setExpiryExtracting] = useState(false)
  const [expiryAutoFilled, setExpiryAutoFilled] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const applyDefaultTitle = useCallback(
    (slug: string, options: ComplianceDocumentTypeOption[]) => {
      if (!titleManuallyEdited) {
        setTitle(buildDefaultComplianceTitle(slug, options))
      }
    },
    [titleManuallyEdited],
  )

  const loadTypes = useCallback(async () => {
    setTypesLoading(true)
    const result = await listComplianceDocumentTypeOptions()
    setTypesLoading(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setTypeOptions(result.types)
    setDocumentType((current) => {
      const next = result.types.some((t) => t.slug === current)
        ? current
        : (result.types[0]?.slug ?? 'iso_27001')
      applyDefaultTitle(next, result.types)
      return next
    })
  }, [applyDefaultTitle])

  function reset() {
    const defaultType = 'iso_27001'
    setDocumentType(defaultType)
    setTypeOptions(getSystemComplianceDocumentTypes())
    setTitle(buildDefaultComplianceTitle(defaultType))
    setTitleManuallyEdited(false)
    setTypeManuallyEdited(false)
    setTypeAutoFilled(false)
    setValidUntil('')
    setValidUntilManuallyEdited(false)
    setExpiryAutoFilled(false)
    setFile(null)
  }

  function handleDocumentTypeChange(slug: string) {
    setDocumentType(slug)
    setTypeManuallyEdited(true)
    setTypeAutoFilled(false)
    applyDefaultTitle(slug, typeOptions)
  }

  async function extractMetadataFromPdf(
    next: File,
    options: {
      titleManuallyEdited: boolean
      typeManuallyEdited: boolean
      validUntilManuallyEdited: boolean
    },
  ) {
    setExpiryExtracting(true)
    setExpiryAutoFilled(false)
    try {
      const formData = new FormData()
      formData.set('file', next)
      const result = await extractComplianceCertificateMetadataFromPdf(formData)
      if (!result.success) return

      if (!options.typeManuallyEdited && result.documentType) {
        setDocumentType(result.documentType)
        setTypeAutoFilled(true)
        if (!options.titleManuallyEdited) {
          setTitle(buildDefaultComplianceTitle(result.documentType, typeOptions))
        }
      }

      if (
        !options.validUntilManuallyEdited &&
        result.validUntil &&
        result.expiryConfidence !== 'none'
      ) {
        setValidUntil(result.validUntil)
        setExpiryAutoFilled(true)
      }
    } finally {
      setExpiryExtracting(false)
    }
  }

  function handleFileChange(next: File | null) {
    setFile(next)
    if (!next) {
      setExpiryAutoFilled(false)
      setTypeAutoFilled(false)
      return
    }

    const inferredTitle = title.trim() || titleFromPdfFilename(next.name)
    if (!titleManuallyEdited) {
      setTitle(inferredTitle)
    }

    const inferredType = inferComplianceDocumentTypeFromUpload({
      title: inferredTitle,
      fileName: next.name,
    })
    if (!typeManuallyEdited && inferredType) {
      setDocumentType(inferredType)
      setTypeAutoFilled(true)
      if (!titleManuallyEdited) {
        setTitle(buildDefaultComplianceTitle(inferredType, typeOptions))
      }
    }

    void extractMetadataFromPdf(next, {
      titleManuallyEdited,
      typeManuallyEdited,
      validUntilManuallyEdited,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Bitte eine PDF-Datei auswählen.')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Titel ist erforderlich.')
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.set('documentType', documentType)
    formData.set('title', trimmedTitle)
    if (validUntil.trim()) formData.set('validUntil', validUntil.trim())
    formData.set('file', file)

    const result = await uploadComplianceDocument(formData)
    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Zertifikat gespeichert.')
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
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="space-y-1 pb-4">
              <DialogTitle className="text-xl">Zertifikat hochladen</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="compliance-doc-type">Dokumenttyp</Label>
                <ComplianceDocumentTypeCombobox
                  options={typeOptions}
                  value={documentType}
                  onValueChange={handleDocumentTypeChange}
                  onOptionsChange={(types) => {
                    setTypeOptions(types)
                    setDocumentType((current) => {
                      const next = types.some((t) => t.slug === current)
                        ? current
                        : (types[0]?.slug ?? 'iso_27001')
                      applyDefaultTitle(next, types)
                      return next
                    })
                  }}
                  disabled={typesLoading || saving || expiryExtracting}
                  onManageTypesClick={() => setTypesDialogOpen(true)}
                />
                {typeAutoFilled && !typeManuallyEdited ? (
                  <p className="text-xs text-muted-foreground">
                    Dokumenttyp automatisch erkannt.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance-doc-title">Titel</Label>
                <Input
                  id="compliance-doc-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setTitleManuallyEdited(true)
                  }}
                  placeholder="z. B. ISO 27001 2026"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance-doc-valid">Gültig bis (optional)</Label>
                <div className="relative">
                  <Input
                    id="compliance-doc-valid"
                    type="date"
                    value={validUntil}
                    onChange={(e) => {
                      setValidUntil(e.target.value)
                      setValidUntilManuallyEdited(true)
                      setExpiryAutoFilled(false)
                    }}
                    disabled={saving || expiryExtracting}
                    className={expiryExtracting ? 'pr-10' : undefined}
                  />
                  {expiryExtracting ? (
                    <Loader2
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </div>
                {expiryExtracting ? (
                  <p className="text-xs text-muted-foreground">
                    Ablaufdatum wird aus dem PDF gelesen…
                  </p>
                ) : expiryAutoFilled && validUntil ? (
                  <p className="text-xs text-muted-foreground">
                    Ablaufdatum automatisch aus dem PDF übernommen.
                  </p>
                ) : null}
              </div>

              <NdaPdfDropzone
                id="compliance-pdf-dropzone"
                file={file}
                onFileChange={handleFileChange}
                disabled={saving}
                uploading={saving}
              />
            </div>

            <DialogFooter className={cn('pt-2')}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Speichern…
                  </>
                ) : (
                  'Speichern'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ComplianceDocumentTypesDialog
        open={typesDialogOpen}
        onOpenChange={setTypesDialogOpen}
        onTypesChange={(types) => {
          setTypeOptions(types)
          setDocumentType((current) => {
            const next = types.some((t) => t.slug === current)
              ? current
              : (types[0]?.slug ?? 'iso_27001')
            applyDefaultTitle(next, types)
            return next
          })
        }}
      />
    </>
  )
}
