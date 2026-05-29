'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download, Loader, Plus, Trash2, UploadIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { resolveNdaDisplayStatus } from '@/lib/accounts/company-entity'
import type { NdaAgreementRow } from '../nda-actions'
import {
  createNdaAgreement,
  deleteNdaAgreement,
  getNdaAgreementDownloadUrl,
  uploadNdaAgreementPdf,
} from '../nda-actions'
import { NdaDocumentIcon } from './nda-document-icon'
import {
  formatNdaValidUntil,
  NdaStatusBadge,
  ndaAgreementStatusLabel,
} from './nda-status-badge'
import { AccountsToolbarTooltip } from './accounts-toolbar-tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
  companyId: string
  companyName: string
  initialAgreements: NdaAgreementRow[]
  canManage: boolean
}

export function CompanyDetailNdaPopover({
  companyId,
  companyName,
  initialAgreements,
  canManage,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [addOpen, setAddOpen] = useState(false)
  const [addStatus, setAddStatus] = useState<'active' | 'pending' | 'expired'>('active')
  const [addUnlimited, setAddUnlimited] = useState(true)
  const [addValidUntil, setAddValidUntil] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NdaAgreementRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadPanelId, setUploadPanelId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setAgreements(initialAgreements)
  }, [initialAgreements])

  const displayStatus = resolveNdaDisplayStatus(
    agreements.map((a) => ({ status: a.status, valid_until: a.valid_until }))
  )

  const expiringSoon = agreements.filter((a) => {
    if (a.status !== 'active' || !a.valid_until) return false
    const end = new Date(`${a.valid_until}T12:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const days = Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    return days >= 0 && days <= 30
  }).length

  function resetAddForm() {
    setAddNotes('')
    setAddValidUntil('')
    setAddUnlimited(true)
    setAddStatus('active')
  }

  async function refreshFromServer() {
    router.refresh()
  }

  async function handleCreate() {
    setAddPending(true)
    try {
      const res = await createNdaAgreement({
        companyId,
        status: addStatus,
        unlimited: addUnlimited,
        validUntil: addValidUntil || null,
        notes: addNotes,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Anlegen fehlgeschlagen.')
        return
      }
      toast.success('NDA-Vereinbarung angelegt.')
      setAddOpen(false)
      resetAddForm()
      setUploadPanelId(res.id)
      await refreshFromServer()
    } finally {
      setAddPending(false)
    }
  }

  async function handleUpload(ndaId: string, file: File, meta: { version: string; signedAt: string }) {
    setUploadingId(ndaId)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('document_version', meta.version)
      fd.set('signed_at', meta.signedAt)
      const res = await uploadNdaAgreementPdf(ndaId, companyId, fd)
      if (!res.success) {
        toast.error(res.error ?? 'Upload fehlgeschlagen.')
        return
      }
      toast.success('PDF gespeichert.')
      setUploadPanelId(null)
      await refreshFromServer()
    } finally {
      setUploadingId(null)
    }
  }

  async function handleDownload(ndaId: string) {
    setDownloadingId(ndaId)
    try {
      const res = await getNdaAgreementDownloadUrl(ndaId, companyId)
      if (!res.success) {
        toast.error(res.error ?? 'Download fehlgeschlagen.')
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await deleteNdaAgreement(deleteTarget.id, companyId)
      if (!res.success) {
        toast.error(res.error ?? 'Löschen fehlgeschlagen.')
        return
      }
      setAgreements((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('NDA gelöscht.')
      setDeleteTarget(null)
      await refreshFromServer()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setAddOpen(false)
            setUploadPanelId(null)
            resetAddForm()
          }
        }}
      >
        <AccountsToolbarTooltip label="NDA-Verwaltung">
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="NDA-Verwaltung"
            >
              <NdaDocumentIcon className="size-[18px] text-foreground/85" />
            </Button>
          </SheetTrigger>
        </AccountsToolbarTooltip>

        <SheetContent
          side="right"
          showCloseButton
          className="flex h-full w-[min(480px,100vw)] max-w-[480px] flex-col gap-0 border-l p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="space-y-3 border-b border-border px-4 py-4 pr-12 text-left">
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-base leading-tight">NDA — {companyName}</SheetTitle>
              {canManage ? (
                <Button type="button" size="sm" className="shrink-0" onClick={() => setAddOpen(true)}>
                  <AppIcon icon={Plus} size={14} className="mr-1" />
                  Hinzufügen
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <NdaStatusBadge status={displayStatus} compact subtle />
              <span>
                {agreements.length}{' '}
                {agreements.length === 1 ? 'Vereinbarung' : 'Vereinbarungen'}
              </span>
              {!canManage ? <span className="text-muted-foreground/80">· Nur Lesen</span> : null}
            </div>
          </SheetHeader>

          {expiringSoon > 0 ? (
            <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {expiringSoon === 1
                ? '1 NDA läuft in den nächsten 30 Tagen ab.'
                : `${expiringSoon} NDAs laufen in den nächsten 30 Tagen ab.`}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {agreements.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/60">
                  <NdaDocumentIcon className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Noch keine NDA-Vereinbarung</p>
                <p className="mt-1 max-w-[280px] text-xs text-muted-foreground leading-relaxed">
                  Dokumentiere hier Vertraulichkeitsvereinbarungen mit {companyName} inkl. PDF und
                  Laufzeit.
                </p>
                {canManage ? (
                  <Button type="button" size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
                    <AppIcon icon={Plus} size={14} className="mr-1.5" />
                    Erste Vereinbarung anlegen
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-2">
                {agreements.map((row) => (
                  <NdaAgreementEntry
                    key={row.id}
                    row={row}
                    canManage={canManage}
                    uploadOpen={uploadPanelId === row.id}
                    onToggleUpload={() =>
                      setUploadPanelId((id) => (id === row.id ? null : row.id))
                    }
                    uploading={uploadingId === row.id}
                    downloading={downloadingId === row.id}
                    fileInputRef={(el) => {
                      fileInputRefs.current[row.id] = el
                    }}
                    onPickFile={() => fileInputRefs.current[row.id]?.click()}
                    onFileSelected={(file, meta) => void handleUpload(row.id, file, meta)}
                    onDownload={() => void handleDownload(row.id)}
                    onDelete={() => setDeleteTarget(row)}
                  />
                ))}
              </ul>
            )}
          </div>

          <SheetFooter className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            Unbefristet = kein Enddatum. PDF-Upload nur für Admin und Account Manager.
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={(v) => !addPending && setAddOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>NDA hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={addStatus}
                onValueChange={(v) => setAddStatus(v as typeof addStatus)}
                disabled={addPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="expired">Abgelaufen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="nda-sheet-unlimited"
                checked={addUnlimited}
                onCheckedChange={(v) => setAddUnlimited(v === true)}
                disabled={addPending}
              />
              <Label htmlFor="nda-sheet-unlimited" className="cursor-pointer font-normal">
                Unbefristet (ohne Enddatum)
              </Label>
            </div>
            {!addUnlimited ? (
              <div className="space-y-1.5">
                <Label htmlFor="nda-sheet-valid-until">Gültig bis</Label>
                <Input
                  id="nda-sheet-valid-until"
                  type="date"
                  value={addValidUntil}
                  onChange={(e) => setAddValidUntil(e.target.value)}
                  disabled={addPending}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="nda-sheet-notes">Notizen (optional)</Label>
              <Textarea
                id="nda-sheet-notes"
                className="min-h-[72px]"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                disabled={addPending}
                placeholder="z. B. Gegenseitigkeit, Ansprechpartner Legal…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addPending}
            >
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={addPending}>
              {addPending ? (
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
              ) : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>NDA löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Vereinbarung und ein ggf. hochgeladenes PDF werden dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? <AppIcon icon={Loader} size={16} className="animate-spin" /> : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

function agreementStatusDot(status: string) {
  if (status === 'active') return 'bg-emerald-500'
  if (status === 'pending') return 'bg-amber-500'
  if (status === 'expired') return 'bg-muted-foreground/50'
  return 'bg-muted-foreground/50'
}

function NdaAgreementEntry({
  row,
  canManage,
  uploadOpen,
  onToggleUpload,
  uploading,
  downloading,
  fileInputRef,
  onPickFile,
  onFileSelected,
  onDownload,
  onDelete,
}: {
  row: NdaAgreementRow
  canManage: boolean
  uploadOpen: boolean
  onToggleUpload: () => void
  uploading: boolean
  downloading: boolean
  fileInputRef: (el: HTMLInputElement | null) => void
  onPickFile: () => void
  onFileSelected: (file: File, meta: { version: string; signedAt: string }) => void
  onDownload: () => void
  onDelete: () => void
}) {
  const [version, setVersion] = useState(row.document_version ?? '')
  const [signedAt, setSignedAt] = useState(row.signed_at ?? '')
  const hasFile = Boolean(row.file_storage_path)

  useEffect(() => {
    setVersion(row.document_version ?? '')
    setSignedAt(row.signed_at ?? '')
  }, [row.document_version, row.signed_at])

  return (
    <li className="rounded-xl border border-border/70 bg-card/50">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span
            className={cn('mt-1.5 size-2 shrink-0 rounded-full', agreementStatusDot(row.status))}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {ndaAgreementStatusLabel(row.status)}
              <span className="font-normal text-muted-foreground">
                {' '}
                · {formatNdaValidUntil(row.valid_until)}
              </span>
            </p>
            {row.notes ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.notes}</p>
            ) : null}
            {hasFile && row.file_name ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{row.file_name}</p>
            ) : !hasFile && canManage ? (
              <p className="mt-1 text-[11px] text-amber-700/90 dark:text-amber-400/90">
                Noch kein PDF hochgeladen
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {hasFile ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              disabled={downloading}
              onClick={onDownload}
            >
              <AppIcon icon={downloading ? Loader : Download} size={14} className="mr-1" />
              PDF
            </Button>
          ) : null}
          {canManage ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onToggleUpload}
              >
                <AppIcon icon={UploadIcon} size={14} className="mr-1" />
                {uploadOpen ? 'Schließen' : hasFile ? 'PDF ersetzen' : 'PDF hochladen'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <AppIcon icon={Trash2} size={14} className="mr-1" />
                Löschen
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {uploadOpen && canManage ? (
        <div className="space-y-3 border-t border-border/60 bg-muted/20 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Version (optional)</Label>
              <Input
                className="h-8 text-xs"
                placeholder="z. B. v2"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Dokumentdatum</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelected(file, { version, signedAt })
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={onPickFile}
          >
            <AppIcon icon={uploading ? Loader : UploadIcon} size={14} className="mr-1.5" />
            PDF auswählen
          </Button>
        </div>
      ) : null}
    </li>
  )
}
