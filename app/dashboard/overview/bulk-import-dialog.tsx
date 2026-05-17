'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UploadIcon, FileText, Cancel01Icon, Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { bulkCreateReferencesFromFiles } from '../actions'
import { runBulkImportExtractionForReference } from '@/app/dashboard/references/bulk-import-post-process'
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
  moveFileToGroup,
  setGroupName,
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
  moveFileToGroup: (fromGroupIndex: number, fromFileIndex: number, toGroupIndex: number) => void
  setGroupName: (groupId: string, projectName: string) => void
}) {
  const router = useRouter()
  const totalFiles = groups.reduce((s, g) => s + g.files.length, 0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewItems, setReviewItems] = useState<BulkImportReviewItem[]>([])
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={BULK_IMPORT_DIALOG_CLASS} showCloseButton={!loading}>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-6 md:px-10 md:py-8">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle>Referenzen importieren</DialogTitle>
          <DialogDescription>
            Bis zu {BULK_IMPORT_MAX_FILES} Dateien ablegen. Pro Gruppe wird eine Referenz mit mehreren Assets angelegt.
            Ziehe Dateikarten auf eine andere, um sie zu einer Projekt-Gruppe zu bündeln.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <input
            ref={dropRef as React.RefObject<HTMLInputElement>}
            type="file"
            multiple
            accept=".pdf,.pptx,.ppt"
            className="hidden"
            onChange={(e) => {
              const list = e.target.files ? Array.from(e.target.files) : []
              addFiles(list)
              e.target.value = ''
            }}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => !loading && dropRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !loading && dropRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (loading) return
              const list = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []
              addFiles(list)
            }}
            className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/30 disabled:pointer-events-none disabled:opacity-60"
          >
            <AppIcon icon={UploadIcon} size={32} />
            <span>Dateien hier ablegen oder klicken (max. {BULK_IMPORT_MAX_FILES})</span>
          </div>

          {groups.length > 0 && (
            <div className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto">
              {groups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-lg border border-border bg-muted/10 p-3">
                  {group.companyName ? (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Kunde: <span className="font-medium text-foreground">{group.companyName}</span>
                    </p>
                  ) : null}
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Projektname
                  </label>
                  <Input
                    value={group.projectName}
                    onChange={(e) => setGroupName(group.id, e.target.value)}
                    disabled={loading}
                    className="mb-2 h-8 text-sm"
                    placeholder="Name der Referenz"
                  />
                  <div className="flex flex-wrap gap-2">
                    {group.files.map((file, fileIndex) => (
                      <div
                        key={`${group.id}-${fileIndex}-${file.name}`}
                        draggable={!loading}
                        onDragStart={(e: React.DragEvent) => {
                          if (loading) return
                          e.dataTransfer.setData('text/plain', `${groupIndex}-${fileIndex}`)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e: React.DragEvent) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e: React.DragEvent) => {
                          e.preventDefault()
                          if (loading) return
                          const raw = e.dataTransfer.getData('text/plain')
                          const [fromGi, fromFi] = raw.split('-').map(Number)
                          if (
                            Number.isFinite(fromGi) &&
                            Number.isFinite(fromFi) &&
                            (fromGi !== groupIndex || fromFi !== fileIndex)
                          ) {
                            moveFileToGroup(fromGi, fromFi, groupIndex)
                          }
                        }}
                        className="flex cursor-grab items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm shadow-sm active:cursor-grabbing"
                      >
                        <AppIcon icon={FileText} size={14} className="shrink-0 text-muted-foreground" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            removeFile(group.id, fileIndex)
                          }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`${file.name} entfernen`}
                        >
                          <AppIcon icon={Cancel01Icon} size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4 md:px-10">
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>

          <Button
            disabled={totalFiles === 0 || loading}
            onClick={async () => {
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
                        group.files
                      )
                      if (!upload.ok) {
                        uploadFailed = true
                        toast.error(
                          upload.error ??
                            `Datei für „${group.projectName}“ konnte nicht gespeichert werden.`,
                          { duration: 8000 }
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
            }}
          >
            {loading ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                {extractionProgress
                  ? `Extrahiere ${extractionProgress.current}/${extractionProgress.total}…`
                  : 'Import läuft…'}
              </>
            ) : (
              `Import starten (${groups.length} Gruppe${groups.length !== 1 ? 'n' : ''}, ${totalFiles} Dateien)`
            )}
          </Button>
        </DialogFooter>
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

