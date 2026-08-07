'use client'

import { Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'
import { validateDealDocumentUpload } from '@/lib/deals/deal-document-upload'

import { DealDocumentDropzone } from './deal-document-dropzone'
import { DealDocumentKindSelect } from './deal-document-kind-select'

export function DealDocumentUploadDialog({
  open,
  onOpenChange,
  kind,
  onKindChange,
  file,
  onFileChange,
  uploading,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: DealDocumentKind
  onKindChange: (kind: DealDocumentKind) => void
  file: File | null
  onFileChange: (file: File | null) => void
  uploading: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.deals.cockpit.documentsUploadTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deal-doc-kind">{COPY.deals.cockpit.documentsKindLabel}</Label>
            <DealDocumentKindSelect
              id="deal-doc-kind"
              value={kind}
              onValueChange={(nextKind) => {
                onKindChange(nextKind)
                if (file) {
                  const validation = validateDealDocumentUpload(file, nextKind)
                  if (!validation.success) {
                    toast.error(validation.error)
                    onFileChange(null)
                  }
                }
              }}
            />
          </div>
          <DealDocumentDropzone
            file={file}
            kind={kind}
            disabled={uploading}
            onFileChange={onFileChange}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onSubmit} disabled={uploading || !file}>
            {uploading ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-1 animate-spin" />
                Wird hochgeladen …
              </>
            ) : (
              COPY.deals.cockpit.documentsUpload
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
