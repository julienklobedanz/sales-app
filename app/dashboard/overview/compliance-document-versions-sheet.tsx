'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ComplianceDocumentRow } from '@/app/dashboard/settings/compliance-actions'
import {
  deleteComplianceDocuments,
  getComplianceDocumentAccessUrls,
  updateComplianceDocument,
  type ComplianceDocumentAccessUrls,
} from '@/app/dashboard/settings/compliance-actions'
import { ComplianceDocumentTypeIcon } from '@/app/dashboard/overview/compliance-document-type-icon'
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
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { isComplianceDocumentExpired } from '@/lib/compliance/expiry'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'
import { formatDateUtcDe } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentType: string | null
  focusDocumentId: string | null
  documents: ComplianceDocumentRow[]
  isAdmin: boolean
  urlCacheRef: React.MutableRefObject<Map<string, ComplianceDocumentAccessUrls>>
}

function archivedVersionSort(a: ComplianceDocumentRow, b: ComplianceDocumentRow): number {
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

function expiryLabel(doc: ComplianceDocumentRow): string {
  if (!doc.valid_until) return 'Unbefristet gültig'
  const formatted = formatComplianceValidUntilDate(doc.valid_until)
  if (isComplianceDocumentExpired(doc.valid_until)) {
    return `Abgelaufen am ${formatted}`
  }
  return `Gültig bis ${formatted}`
}

function toDateInputValue(validUntil: string | null): string {
  if (!validUntil) return ''
  const raw = String(validUntil).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  if (!Number.isFinite(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export function ComplianceDocumentVersionsSheet({
  open,
  onOpenChange,
  documentType,
  focusDocumentId,
  documents,
  isAdmin,
  urlCacheRef,
}: Props) {
  const router = useRouter()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ComplianceDocumentRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<ComplianceDocumentRow | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editValidUntil, setEditValidUntil] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const { currentVersion, archivedVersions, versionCount } = useMemo(() => {
    if (!documentType) {
      return { currentVersion: null, archivedVersions: [], versionCount: 0 }
    }
    const typeVersions = documents.filter((doc) => doc.document_type === documentType)
    const current = typeVersions.find((doc) => doc.is_current) ?? null
    const archived = typeVersions
      .filter((doc) => !doc.is_current)
      .sort(archivedVersionSort)
    return {
      currentVersion: current,
      archivedVersions: archived,
      versionCount: typeVersions.length,
    }
  }, [documentType, documents])

  function openEditDialog(doc: ComplianceDocumentRow) {
    setEditTarget(doc)
    setEditTitle(doc.title)
    setEditValidUntil(toDateInputValue(doc.valid_until))
  }

  async function resolveAccessUrls(
    doc: ComplianceDocumentRow
  ): Promise<ComplianceDocumentAccessUrls | null> {
    const cached = urlCacheRef.current.get(doc.id)
    if (cached) return cached

    setResolvingId(doc.id)
    try {
      const result = await getComplianceDocumentAccessUrls(doc.id)
      if (!result.success) {
        toast.error(result.error)
        return null
      }
      urlCacheRef.current.set(doc.id, result.urls)
      return result.urls
    } finally {
      setResolvingId(null)
    }
  }

  async function handleDownload(doc: ComplianceDocumentRow) {
    if (!doc.file_storage_path) {
      toast.error('Für diese Version ist keine Datei hinterlegt.')
      return
    }
    const urls = await resolveAccessUrls(doc)
    if (!urls) return
    const anchor = document.createElement('a')
    anchor.href = urls.downloadUrl
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const result = await deleteComplianceDocuments([deleteTarget.id])
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        deleteTarget.is_current ? 'Zertifikat gelöscht.' : 'Archiv-Version gelöscht.'
      )
      setDeleteTarget(null)
      if (deleteTarget.is_current && versionCount <= 1) {
        onOpenChange(false)
      }
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      toast.error('Titel ist erforderlich.')
      return
    }
    setSavingEdit(true)
    try {
      const result = await updateComplianceDocument({
        documentId: editTarget.id,
        title: trimmedTitle,
        validUntil: editValidUntil.trim() || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Zertifikat aktualisiert.')
      setEditTarget(null)
      router.refresh()
    } finally {
      setSavingEdit(false)
    }
  }

  const typeLabel = documentType ? complianceDocumentTypeLabel(documentType) : 'Zertifikat'

  const versionCardActions = {
    resolvingId,
    canManage: isAdmin,
    onEdit: isAdmin ? openEditDialog : undefined,
    onDelete: isAdmin ? setDeleteTarget : undefined,
    onDownload: handleDownload,
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex h-full w-[min(480px,100vw)] max-w-[480px] flex-col gap-0 border-l p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="space-y-3 border-b border-border px-4 py-4 pr-12 text-left">
            <SheetTitle className="text-base leading-tight">Versionshistorie</SheetTitle>
            <SheetDescription className="sr-only">
              Archivierte und abgelaufene Versionen des Zertifikats
            </SheetDescription>
            <div className="flex items-start gap-3">
              {documentType ? (
                <ComplianceDocumentTypeIcon
                  documentType={documentType}
                  title={currentVersion?.title ?? typeLabel}
                  fileName={currentVersion?.file_name}
                  className="mt-0.5 shrink-0"
                />
              ) : null}
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">{typeLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {versionCount}{' '}
                  {versionCount === 1 ? 'Version' : 'Versionen'}
                  {archivedVersions.length > 0
                    ? ` — ${archivedVersions.length} ältere ${archivedVersions.length === 1 ? 'Version' : 'Versionen'} archiviert`
                    : ''}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {versionCount === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Versionen gefunden.</p>
            ) : (
              <div>
                {currentVersion ? (
                  <section aria-label="Aktuelle Version" className="space-y-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Aktuelle Version
                    </h3>
                    <VersionCard
                      doc={currentVersion}
                      variant="current"
                      focused={currentVersion.id === focusDocumentId}
                      {...versionCardActions}
                    />
                  </section>
                ) : null}

                {archivedVersions.length > 0 ? (
                  <>
                    {currentVersion ? (
                      <div className="my-5 flex items-center gap-3" role="separator" aria-hidden>
                        <Separator className="flex-1" />
                      </div>
                    ) : null}

                    <section aria-label="Ältere Versionen" className="space-y-2.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Ältere Versionen
                      </h3>
                      <ul className="space-y-2">
                        {archivedVersions.map((doc) => (
                          <li key={doc.id}>
                            <VersionCard
                              doc={doc}
                              variant="archived"
                              focused={doc.id === focusDocumentId}
                              {...versionCardActions}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(next) => {
          if (!savingEdit) setEditTarget(next ? editTarget : null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zertifikat bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="compliance-edit-title">Titel</Label>
              <Input
                id="compliance-edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance-edit-valid">Gültig bis (optional)</Label>
              <Input
                id="compliance-edit-valid"
                type="date"
                value={editValidUntil}
                onChange={(e) => setEditValidUntil(e.target.value)}
                disabled={savingEdit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={savingEdit}
            >
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void handleSaveEdit()} disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Speichern…
                </>
              ) : (
                'Speichern'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!deleting) setDeleteTarget(next ? deleteTarget : null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.is_current ? 'Zertifikat löschen?' : 'Archiv-Version löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteTarget?.title}“ wird dauerhaft entfernt — inklusive der zugehörigen PDF-Datei.
              {deleteTarget?.is_current
                ? ' Wenn du nur eine neue Version hochladen willst, nutze stattdessen „Zertifikat hochladen“.'
                : ' Die aktuelle Version bleibt unverändert.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? 'Wird gelöscht…' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function VersionCard({
  doc,
  variant = 'archived',
  focused = false,
  resolvingId,
  canManage,
  onEdit,
  onDelete,
  onDownload,
}: {
  doc: ComplianceDocumentRow
  variant?: 'current' | 'archived'
  focused?: boolean
  resolvingId: string | null
  canManage: boolean
  onEdit?: (doc: ComplianceDocumentRow) => void
  onDelete?: (doc: ComplianceDocumentRow) => void
  onDownload: (doc: ComplianceDocumentRow) => void | Promise<void>
}) {
  const expired = isComplianceDocumentExpired(doc.valid_until)
  const isCurrent = variant === 'current'

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5',
        isCurrent
          ? 'border-primary/35 bg-primary/[0.06] shadow-sm shadow-primary/5'
          : 'border-border/70 bg-muted/20',
        focused && 'ring-2 ring-primary/25'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-foreground">{doc.title}</p>
          <p className="text-xs text-muted-foreground">{expiryLabel(doc)}</p>
          <p className="text-xs text-muted-foreground">
            Hochgeladen: {formatDateUtcDe(doc.updated_at)}
            {doc.file_name ? ` · ${doc.file_name}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {isCurrent ? (
              <Badge variant="secondary" className="text-[10px] font-medium">
                Aktuelle Version
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                Archiv
              </Badge>
            )}
            {expired ? (
              <Badge variant="outline" className="text-[10px] font-medium text-amber-800">
                Abgelaufen
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canManage && onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(doc)}
              aria-label={`${doc.title} bearbeiten`}
              data-compliance-skip-row-click
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
          ) : null}
          {canManage && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(doc)}
              aria-label={`${doc.title} löschen`}
              data-compliance-skip-row-click
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            disabled={!doc.file_storage_path || resolvingId === doc.id}
            onClick={() => void onDownload(doc)}
            aria-label={`${doc.title} herunterladen`}
            data-compliance-skip-row-click
          >
            {resolvingId === doc.id ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4 text-muted-foreground" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
