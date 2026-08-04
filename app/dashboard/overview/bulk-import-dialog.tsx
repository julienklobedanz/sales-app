'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  UploadIcon,
  FileText,
  Cancel01Icon,
  Loader,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { cn } from '@/lib/utils'
import { isSuspiciousBulkImportProjectName } from '@/lib/references/bulk-import-preview-utils'

import { bulkCreateReferencesFromFiles } from '../actions'
import { runBulkImportExtractionForReference } from '@/lib/references/library/bulk-import-post-process'
import { extractBulkImportReferenceFromFile } from '@/lib/references/bulk-import-extract-client'
import { uploadBulkImportFilesForReference } from '@/lib/references/bulk-import-upload'
import { createClient } from '@/lib/supabase/client'
import type { BulkImportExtractionResult } from '@/lib/references/bulk-import-review-types'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import {
  BulkImportReviewDialog,
  type BulkImportReviewItem,
} from './bulk-import-review-dialog'

export type BulkImportGroupItem = {
  id: string
  projectName: string
  companyName?: string
  files: File[]
}

const BULK_IMPORT_DIALOG_CLASS =
  'flex max-h-[min(90vh,920px)] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-[90vw] lg:max-w-7xl'

const BULK_IMPORT_ROW_GRID_CLASS =
  'grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(140px,220px)_minmax(0,1fr)_minmax(180px,34%)] lg:items-center lg:gap-4'

const BULK_IMPORT_HEADER_CLASS = 'text-xs font-medium text-muted-foreground'

const BULK_IMPORT_FILE_DRAG_MIME = 'application/x-refstack-bulk-import-file'

export function BulkImportDialog({
  open,
  onOpenChange,
  loading,
  onLoadingChange,
  groups,
  setGroups,
  dropRef,
  addFiles,
  removeFile,
  moveFile,
  setGroupName,
  setCompanyName,
  mergeSelectedGroups,
  previewPendingFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onLoadingChange?: (loading: boolean) => void
  groups: BulkImportGroupItem[]
  setGroups: React.Dispatch<React.SetStateAction<BulkImportGroupItem[]>>
  dropRef: React.RefObject<HTMLInputElement | null>
  addFiles: (files: File[]) => void
  removeFile: (groupId: string, fileIndex: number) => void
  moveFile: (fromGroupId: string, fileIndex: number, toGroupId: string) => void
  setGroupName: (groupId: string, projectName: string) => void
  setCompanyName: (groupId: string, companyName: string) => void
  mergeSelectedGroups: (groupIds: string[]) => void
  previewPendingFiles: Set<File>
}) {
  const router = useRouter()
  const totalFiles = groups.reduce((s, g) => s + g.files.length, 0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewItems, setReviewItems] = useState<BulkImportReviewItem[]>([])
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set())
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [companyDraft, setCompanyDraft] = useState('')
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [draggingFileKey, setDraggingFileKey] = useState<string | null>(null)

  const hasFiles = groups.length > 0
  const selectedCount = selectedGroupIds.size
  const canMergeSelected = selectedCount >= 2

  useEffect(() => {
    if (!open) {
      setSelectedGroupIds(new Set())
      setEditingCompanyId(null)
      setCompanyDraft('')
      setDragOverGroupId(null)
      setDraggingFileKey(null)
    }
  }, [open])

  useEffect(() => {
    setSelectedGroupIds((prev) => {
      const valid = new Set(groups.map((g) => g.id))
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [groups])

  function toggleGroupSelection(groupId: string, checked: boolean) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(groupId)
      else next.delete(groupId)
      return next
    })
  }

  function startCompanyEdit(group: BulkImportGroupItem) {
    setEditingCompanyId(group.id)
    setCompanyDraft(group.companyName ?? '')
  }

  function commitCompanyEdit(groupId: string) {
    setCompanyName(groupId, companyDraft)
    setEditingCompanyId(null)
    setCompanyDraft('')
  }

  function isGroupPreviewPending(group: BulkImportGroupItem) {
    return group.files.some((file) => previewPendingFiles.has(file))
  }

  function fileChipKey(groupId: string, file: File) {
    return `${groupId}:${file.name}:${file.size}:${file.lastModified}`
  }

  function handleFileChipDragStart(
    event: React.DragEvent<HTMLDivElement>,
    groupId: string,
    fileIndex: number,
    chipKey: string,
  ) {
    if (loading) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(
      BULK_IMPORT_FILE_DRAG_MIME,
      JSON.stringify({ fromGroupId: groupId, fileIndex }),
    )
    event.dataTransfer.effectAllowed = 'move'
    setDraggingFileKey(chipKey)
  }

  function handleDocumentsDragOver(
    event: React.DragEvent<HTMLDivElement>,
    groupId: string,
  ) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverGroupId(groupId)
  }

  function handleDocumentsDrop(
    event: React.DragEvent<HTMLDivElement>,
    toGroupId: string,
  ) {
    event.preventDefault()
    event.stopPropagation()
    setDragOverGroupId(null)
    setDraggingFileKey(null)

    try {
      const raw = event.dataTransfer.getData(BULK_IMPORT_FILE_DRAG_MIME)
      if (!raw) return
      const payload = JSON.parse(raw) as { fromGroupId: string; fileIndex: number }
      if (!payload.fromGroupId || typeof payload.fileIndex !== 'number') return
      moveFile(payload.fromGroupId, payload.fileIndex, toGroupId)
    } catch {
      // Ungültige Drag-Daten ignorieren
    }
  }

  const handleImport = async () => {
    const formData = new FormData()
    formData.append(
      'groups',
      JSON.stringify(
        groups.map((g) => ({
          projectName: g.projectName,
          companyName: g.companyName ?? '',
          fileCount: g.files.length,
        })),
      ),
    )
    groups.forEach((g) => {
      g.files.forEach((f) => formData.append('files', f))
    })

    onLoadingChange?.(true)
    setExtractionProgress(null)
    try {
      const result = await bulkCreateReferencesFromFiles(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      const ids = result.referenceIds
      let organizationId =
        'organizationId' in result ? String(result.organizationId ?? '') : ''
      if (!organizationId) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()
          organizationId = String(profile?.organization_id ?? '')
        }
      }

      let uploadFailed = false
      if (ids.length > 0 && organizationId) {
        let refIdx = 0
        for (const group of groups) {
          const refId = ids[refIdx]
          if (refId && group.files.length > 0) {
            const upload = await uploadBulkImportFilesForReference(
              organizationId,
              refId,
              group.files,
            )
            if (!upload.ok) {
              uploadFailed = true
              toast.error(
                upload.error ??
                  `Datei für „${group.projectName}“ konnte nicht gespeichert werden.`,
                { duration: 8000 },
              )
            }
          }
          refIdx += 1
        }
      }
      if (uploadFailed) {
        onLoadingChange?.(false)
        setExtractionProgress(null)
        router.refresh()
        return
      }

      if (ids.length === 0) {
        toast.error(
          result.created === 0
            ? 'Es wurde keine Referenz angelegt. Bitte Dateien prüfen.'
            : 'Nach dem Import fehlten Referenz-IDs für die Extraktion.',
        )
        onOpenChange(false)
        setGroups([])
        router.refresh()
        return
      }
      let completeCount = 0
      const pendingReview: BulkImportReviewItem[] = []

      for (let i = 0; i < ids.length; i++) {
        setExtractionProgress({ current: i + 1, total: ids.length })
        const id = ids[i]!
        const primaryFile = groups[i]?.files[0]
        let r: BulkImportExtractionResult
        if (primaryFile && primaryFile.size > 0) {
          r = await extractBulkImportReferenceFromFile(id, primaryFile)
        } else {
          r = await runBulkImportExtractionForReference(id)
        }
        if (!r.success) {
          pendingReview.push({
            referenceId: id,
            title: 'Referenz',
            needsInput: true,
            extractionOk: false,
            extractionError: r.error,
            suggestions: {},
          })
          continue
        }
        if (!r.needsInput) completeCount++
        const showReview =
          r.needsInput ||
          !r.extractionOk ||
          Boolean(String(r.extractionError ?? '').trim())
        if (showReview) {
          pendingReview.push({
            referenceId: r.referenceId,
            title: r.title,
            needsInput: r.needsInput,
            extractionOk: r.extractionOk,
            extractionError: r.extractionError,
            suggestions: r.suggestions,
          })
        }
      }

      const needsMoreCount = ids.length - completeCount
      if (needsMoreCount > 0) {
        toast.success(
          `${completeCount} Referenzen erfolgreich importiert, ${needsMoreCount} Referenzen benötigen weiteren Input.`,
          { duration: 6500 },
        )
      } else {
        toast.success(
          `${completeCount} Referenz${completeCount !== 1 ? 'en' : ''} erfolgreich importiert.`,
          { duration: 5000 },
        )
      }

      onOpenChange(false)
      setGroups([])
      router.refresh()
      setExtractionProgress(null)

      if (pendingReview.length > 0) {
        setReviewItems(pendingReview)
        window.setTimeout(() => setReviewOpen(true), 400)
      } else {
        setReviewItems([])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    } finally {
      onLoadingChange?.(false)
    }
  }

  function handleFileDrop(event: React.DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (loading) return
    const list = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : []
    addFiles(list)
  }

  function renderDropZone(compact: boolean) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && dropRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && !loading && dropRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={handleFileDrop}
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-60',
          compact
            ? 'h-10 gap-2 px-3 text-left text-xs sm:text-sm'
            : 'min-h-[160px] flex-col gap-2 p-6 text-center text-sm',
        )}
      >
        <AppIcon icon={UploadIcon} size={compact ? 16 : 32} className="shrink-0" />
        <span className={cn(compact && 'min-w-0 truncate')}>
          {compact
            ? `Weitere Dateien ablegen oder klicken (max. ${BULK_IMPORT_MAX_FILES})`
            : `Dateien hier ablegen oder klicken (max. ${BULK_IMPORT_MAX_FILES})`}
        </span>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={BULK_IMPORT_DIALOG_CLASS} showCloseButton={!loading}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 md:px-10 md:py-5">
            <DialogHeader className="shrink-0 space-y-1 text-left">
              <DialogTitle>Referenzen importieren</DialogTitle>
              <DialogDescription>
                Lege bis zu {BULK_IMPORT_MAX_FILES} Dateien ab. Alle Uploads werden
                automatisch Kunden zugeordnet.
              </DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                'min-h-0 flex-1 pt-3',
                hasFiles ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
              )}
            >
              <input
                ref={dropRef as React.RefObject<HTMLInputElement>}
                type="file"
                multiple
                accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : []
                  addFiles(list)
                  e.target.value = ''
                }}
              />

              {!hasFiles ? renderDropZone(false) : null}

              {hasFiles ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
                  <div className="flex shrink-0 gap-3 border-b border-border bg-white px-3 py-2">
                    <div className="size-4 shrink-0" aria-hidden />
                    <div
                      className={cn(BULK_IMPORT_ROW_GRID_CLASS, BULK_IMPORT_HEADER_CLASS)}
                    >
                      <span>Kunde</span>
                      <span>Referenztitel</span>
                      <span>Dokumente</span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                    {groups.map((group) => {
                      const previewPending = isGroupPreviewPending(group)
                      const suspiciousTitle = isSuspiciousBulkImportProjectName(
                        group.projectName,
                      )
                      const isEditingCompany = editingCompanyId === group.id

                      return (
                        <div
                          key={group.id}
                          className="flex items-center gap-3 border-b border-border bg-white px-3 py-2.5 last:border-b-0"
                        >
                          <Checkbox
                            className="self-center"
                            checked={selectedGroupIds.has(group.id)}
                            disabled={loading}
                            onCheckedChange={(checked) =>
                              toggleGroupSelection(group.id, checked === true)
                            }
                            aria-label={`${group.projectName || 'Referenz'} auswählen`}
                          />

                          <div className={BULK_IMPORT_ROW_GRID_CLASS}>
                            <div className="flex min-w-0 items-center gap-1.5">
                              {isEditingCompany ? (
                                <Input
                                  value={companyDraft}
                                  onChange={(e) => setCompanyDraft(e.target.value)}
                                  onBlur={() => commitCompanyEdit(group.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitCompanyEdit(group.id)
                                    if (e.key === 'Escape') {
                                      setEditingCompanyId(null)
                                      setCompanyDraft('')
                                    }
                                  }}
                                  disabled={loading}
                                  autoFocus
                                  className="h-7 min-w-0 flex-1 text-sm"
                                />
                              ) : (
                                <>
                                  <span
                                    className={cn(
                                      'min-w-0 truncate text-sm font-medium',
                                      group.companyName
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                    )}
                                  >
                                    {group.companyName?.trim() || '—'}
                                  </span>
                                  <AccountsToolbarTooltip label="Kunde bearbeiten">
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => startCompanyEdit(group)}
                                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      aria-label="Kunde bearbeiten"
                                    >
                                      <AppIcon icon={PencilEdit01Icon} size={14} />
                                    </button>
                                  </AccountsToolbarTooltip>
                                </>
                              )}
                            </div>

                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <Input
                                value={group.projectName}
                                onChange={(e) => setGroupName(group.id, e.target.value)}
                                disabled={loading}
                                className="h-8 min-w-0 flex-1 text-sm"
                                placeholder="Referenztitel"
                                aria-label="Referenztitel"
                              />
                              {previewPending ? (
                                <RefreshCw
                                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                                  aria-hidden
                                />
                              ) : null}
                              {!previewPending && suspiciousTitle ? (
                                <AccountsToolbarTooltip label="Projektname prüfen — evtl. Zeitraum statt Titel erkannt">
                                  <span className="inline-flex shrink-0 text-amber-600">
                                    <AlertTriangle className="size-4" aria-hidden />
                                  </span>
                                </AccountsToolbarTooltip>
                              ) : null}
                            </div>

                            <div
                              className={cn(
                                'flex min-h-9 min-w-0 flex-wrap gap-1.5 rounded-md transition-colors lg:justify-end',
                                dragOverGroupId === group.id &&
                                  'bg-primary/10 ring-1 ring-inset ring-primary/40',
                              )}
                              onDragOver={(event) =>
                                handleDocumentsDragOver(event, group.id)
                              }
                              onDragLeave={(event) => {
                                if (
                                  !event.currentTarget.contains(
                                    event.relatedTarget as Node,
                                  )
                                ) {
                                  setDragOverGroupId((prev) =>
                                    prev === group.id ? null : prev,
                                  )
                                }
                              }}
                              onDrop={(event) => handleDocumentsDrop(event, group.id)}
                            >
                              {group.files.map((file, fileIndex) => {
                                const chipKey = fileChipKey(group.id, file)
                                return (
                                  <div
                                    key={chipKey}
                                    draggable={!loading}
                                    onDragStart={(event) =>
                                      handleFileChipDragStart(
                                        event,
                                        group.id,
                                        fileIndex,
                                        chipKey,
                                      )
                                    }
                                    onDragEnd={() => {
                                      setDraggingFileKey(null)
                                      setDragOverGroupId(null)
                                    }}
                                    className={cn(
                                      'flex max-w-full cursor-grab items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm active:cursor-grabbing',
                                      draggingFileKey === chipKey && 'opacity-50',
                                    )}
                                  >
                                    <AppIcon
                                      icon={FileText}
                                      size={12}
                                      className="shrink-0 text-muted-foreground"
                                    />
                                    <span className="max-w-[100px] truncate sm:max-w-[120px]">
                                      {file.name}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => removeFile(group.id, fileIndex)}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      aria-label={`${file.name} entfernen`}
                                    >
                                      <AppIcon icon={Cancel01Icon} size={12} />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border py-3">
              <div className="flex items-center gap-3">
                {hasFiles ? (
                  <div className="min-w-0 flex-1">{renderDropZone(true)}</div>
                ) : (
                  <div className="flex-1" aria-hidden />
                )}

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="toolbar"
                    disabled={!canMergeSelected || loading}
                    onClick={() => {
                      mergeSelectedGroups(Array.from(selectedGroupIds))
                      setSelectedGroupIds(new Set())
                    }}
                  >
                    Ausgewählte gruppieren
                  </Button>
                  <Button
                    variant="outline"
                    size="toolbar"
                    disabled={loading}
                    onClick={() => onOpenChange(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="toolbar"
                    disabled={totalFiles === 0 || loading}
                    onClick={() => void handleImport()}
                  >
                    {loading ? (
                      <>
                        <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                        {extractionProgress
                          ? `Extrahiere ${extractionProgress.current}/${extractionProgress.total}…`
                          : 'Import läuft…'}
                      </>
                    ) : (
                      'Import starten'
                    )}
                  </Button>
                </div>
              </div>
              {totalFiles > 0 ? (
                <p className="mt-1.5 text-right text-xs text-muted-foreground">
                  {groups.length} Gruppe{groups.length !== 1 ? 'n' : ''} · {totalFiles}{' '}
                  Datei
                  {totalFiles !== 1 ? 'en' : ''}
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <BulkImportReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        items={reviewItems}
      />
    </>
  )
}
