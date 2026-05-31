'use client'

import { useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { uploadComplianceDocument } from '@/app/dashboard/settings/compliance-actions'
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
import type { ComplianceDocumentTypeOption } from '@/lib/compliance/document-types'
import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComplianceUploadDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [documentType, setDocumentType] = useState('iso_27001')
  const [typeOptions, setTypeOptions] = useState<ComplianceDocumentTypeOption[]>([])
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [file, setFile] = useState<File | null>(null)
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
    setDocumentType((current) =>
      result.types.some((t) => t.slug === current)
        ? current
        : (result.types[0]?.slug ?? 'iso_27001')
    )
  }, [])

  function reset() {
    setDocumentType('iso_27001')
    setTitle('')
    setValidUntil('')
    setFile(null)
  }

  function handleFileChange(next: File | null) {
    setFile(next)
    if (!next) return

    const inferredTitle = title.trim() || titleFromPdfFilename(next.name)
    if (!title.trim()) {
      setTitle(inferredTitle)
    }

    const inferredType = inferComplianceDocumentTypeFromUpload({
      title: inferredTitle,
      fileName: next.name,
    })
    if (inferredType) {
      setDocumentType(inferredType)
    }
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
                  onValueChange={setDocumentType}
                  onOptionsChange={setTypeOptions}
                  disabled={typesLoading || saving}
                  onManageTypesClick={() => setTypesDialogOpen(true)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance-doc-title">Titel</Label>
                <Input
                  id="compliance-doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. ISO 27001 Zertifikat 2026"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance-doc-valid">Gültig bis (optional)</Label>
                <Input
                  id="compliance-doc-valid"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  disabled={saving}
                />
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
          setDocumentType((current) =>
            types.some((t) => t.slug === current) ? current : (types[0]?.slug ?? 'iso_27001')
          )
        }}
      />
    </>
  )
}
