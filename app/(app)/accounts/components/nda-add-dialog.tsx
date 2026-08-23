'use client'

import { Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { NdaPdfDropzone } from './nda-pdf-dropzone'

export type NdaAddStatus = 'active' | 'pending' | 'expired'

export function NdaAddDialog({
  open,
  onOpenChange,
  pending,
  title,
  onTitleChange,
  status,
  onStatusChange,
  unlimited,
  onUnlimitedChange,
  validUntil,
  onValidUntilChange,
  pdfFile,
  onPdfFileChange,
  notes,
  onNotesChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  title: string
  onTitleChange: (value: string) => void
  status: NdaAddStatus
  onStatusChange: (value: NdaAddStatus) => void
  unlimited: boolean
  onUnlimitedChange: (value: boolean) => void
  validUntil: string
  onValidUntilChange: (value: string) => void
  pdfFile: File | null
  onPdfFileChange: (file: File | null) => void
  notes: string
  onNotesChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>NDA hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_11.5rem] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="nda-sheet-title">Titel</Label>
              <Input
                id="nda-sheet-title"
                className="h-10"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                disabled={pending}
                placeholder="z. B. Rahmen-NDA 2024"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => onStatusChange(v as NdaAddStatus)}
                disabled={pending}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="nda-sheet-unlimited"
              checked={unlimited}
              onCheckedChange={(v) => onUnlimitedChange(v === true)}
              disabled={pending}
            />
            <Label htmlFor="nda-sheet-unlimited" className="cursor-pointer font-normal">
              Unbefristet (ohne Enddatum)
            </Label>
          </div>
          {!unlimited ? (
            <div className="space-y-1.5">
              <Label htmlFor="nda-sheet-valid-until">Gültig bis</Label>
              <Input
                id="nda-sheet-valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => onValidUntilChange(e.target.value)}
                disabled={pending}
              />
            </div>
          ) : null}
          <NdaPdfDropzone
            id="nda-sheet-pdf"
            file={pdfFile}
            onFileChange={onPdfFileChange}
            disabled={pending}
            uploading={pending && Boolean(pdfFile)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="nda-sheet-notes">Notizen (optional)</Label>
            <Textarea
              id="nda-sheet-notes"
              className="min-h-[72px]"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              disabled={pending}
              placeholder="z. B. Gegenseitigkeit, Ansprechpartner Legal…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Abbrechen
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? (
              <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
            ) : null}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
