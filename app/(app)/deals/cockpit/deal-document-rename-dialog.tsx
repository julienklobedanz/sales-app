'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { COPY } from '@/lib/copy'

export function DealDocumentRenameDialog({
  open,
  value,
  pending,
  onValueChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  value: string
  pending: boolean
  onValueChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.deals.cockpit.documentsRenameTitle}</DialogTitle>
        </DialogHeader>
        <Input value={value} onChange={(e) => onValueChange(e.target.value)} autoFocus />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending || !value.trim()}
          >
            {pending ? 'Speichern …' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
