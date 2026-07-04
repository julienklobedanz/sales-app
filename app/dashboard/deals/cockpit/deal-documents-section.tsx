'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, Loader, MoreHorizontal, UploadIcon } from '@hugeicons/core-free-icons'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'
import {
  DEAL_DOCUMENT_KINDS,
  DEAL_DOCUMENT_KIND_LABELS,
  type DealDocumentKind,
} from '@/lib/deals/deal-document-kinds'
import { validateDealDocumentUpload } from '@/lib/deals/deal-document-upload'

import type { DealDocumentRow } from '../document-actions'
import {
  deleteDealDocument,
  getDealDocumentSignedUrl,
  renameDealDocument,
  setDealDocumentKind,
  uploadDealDocument,
} from '../document-actions'

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatUploadedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function KindSelect({
  value,
  onValueChange,
  id,
}: {
  value: DealDocumentKind
  onValueChange: (v: DealDocumentKind) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as DealDocumentKind)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DEAL_DOCUMENT_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {DEAL_DOCUMENT_KIND_LABELS[kind]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DocumentDropzone({
  file,
  kind,
  onFileChange,
  disabled,
}: {
  file: File | null
  kind: DealDocumentKind
  onFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function acceptFile(next: File | undefined) {
    if (!next) return
    const validation = validateDealDocumentUpload(next, kind)
    if (!validation.ok) {
      toast.error(validation.error)
      return
    }
    onFileChange(next)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        'w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
        dragOver && !disabled ? 'border-primary/50 bg-muted/60' : 'border-border bg-muted/30',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        acceptFile(e.dataTransfer.files?.[0])
      }}
    >
      {file ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} · {COPY.deals.cockpit.documentsDropzoneReplace}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <AppIcon icon={UploadIcon} size={20} />
          {COPY.deals.cockpit.documentsDropzoneHint}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function DealDocumentsSection({
  dealId,
  documents: initialDocuments,
  canManage,
}: {
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
}) {
  const router = useRouter()
  const [documents, setDocuments] = useState(initialDocuments)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadKind, setUploadKind] = useState<DealDocumentKind>('sonstiges')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DealDocumentRow | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamePending, setRenamePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DealDocumentRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [downloadPendingId, setDownloadPendingId] = useState<string | null>(null)

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
      setUploadKind('sonstiges')
      router.refresh()
    } finally {
      setUploading(false)
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

  return (
    <>
      <Card id="dokumente" className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {canManage ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <AppIcon icon={CirclePlus} size={16} className="mr-1" />
              {COPY.deals.cockpit.documentsUpload}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.documentsEmpty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{doc.file_name}</span>
                      <Badge variant="secondary">{DEAL_DOCUMENT_KIND_LABELS[doc.kind]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(doc.size_bytes)}
                      {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
                      {` · ${formatUploadedAt(doc.created_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={downloadPendingId === doc.id}
                      onClick={() => handleDownload(doc)}
                    >
                      {downloadPendingId === doc.id ? (
                        <AppIcon icon={Loader} size={16} className="animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      <span className="sr-only">{COPY.deals.cockpit.documentsDownload}</span>
                    </Button>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="size-8">
                            <AppIcon icon={MoreHorizontal} size={16} />
                            <span className="sr-only">Aktionen</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setRenameTarget(doc)
                              setRenameValue(doc.file_name)
                            }}
                          >
                            {COPY.deals.cockpit.documentsRename}
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              {COPY.deals.cockpit.documentsChangeKind}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {DEAL_DOCUMENT_KINDS.map((kind) => (
                                <DropdownMenuItem
                                  key={kind}
                                  disabled={kind === doc.kind}
                                  onSelect={() => handleKindChange(doc, kind)}
                                >
                                  {DEAL_DOCUMENT_KIND_LABELS[kind]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setDeleteTarget(doc)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {COPY.deals.cockpit.documentsDelete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.deals.cockpit.documentsUploadTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal-doc-kind">{COPY.deals.cockpit.documentsKindLabel}</Label>
              <KindSelect
                id="deal-doc-kind"
                value={uploadKind}
                onValueChange={(kind) => {
                  setUploadKind(kind)
                  if (uploadFile) {
                    const validation = validateDealDocumentUpload(uploadFile, kind)
                    if (!validation.ok) {
                      toast.error(validation.error)
                      setUploadFile(null)
                    }
                  }
                }}
              />
            </div>
            <DocumentDropzone
              file={uploadFile}
              kind={uploadKind}
              disabled={uploading}
              onFileChange={setUploadFile}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleUpload} disabled={uploading || !uploadFile}>
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

      <Dialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{COPY.deals.cockpit.documentsRenameTitle}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleRename}
              disabled={renamePending || !renameValue.trim()}
            >
              {renamePending ? 'Speichern …' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.deals.cockpit.documentsDeleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.file_name ?? ''} wird aus dem Deal und dem Speicher entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {deletePending ? 'Löschen …' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
