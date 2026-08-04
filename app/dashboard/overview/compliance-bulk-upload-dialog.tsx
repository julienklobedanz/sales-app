'use client'

import { useCallback, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Cancel01Icon, FileText, Loader } from '@hugeicons/core-free-icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { log } from '@/lib/observability/logger'

import {
  extractComplianceCertificateMetadataFromPdf,
  uploadComplianceDocumentsBatch,
} from '@/app/dashboard/settings/compliance-actions'
import { listComplianceDocumentTypeOptions } from '@/app/dashboard/settings/compliance-document-type-actions'
import { ComplianceDocumentTypeCombobox } from '@/app/dashboard/overview/compliance-document-type-combobox'
import { ComplianceDocumentTypesDialog } from '@/app/dashboard/overview/compliance-document-types-dialog'
import { ComplianceMultiPdfDropzone } from '@/app/dashboard/overview/compliance-multi-pdf-dropzone'
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
import {
  getSystemComplianceDocumentTypes,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'
import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { buildDefaultComplianceTitle } from '@/lib/compliance/upload-filename'
import { cn } from '@/lib/utils'

const DIALOG_CLASS =
  'flex max-h-[min(90vh,920px)] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-[90vw] lg:max-w-7xl'

const ROW_GRID_CLASS =
  'grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(160px,240px)_minmax(0,1fr)_minmax(180px,34%)] lg:items-center lg:gap-4'

const HEADER_CLASS = 'text-xs font-medium text-muted-foreground'

const FILE_DRAG_MIME = 'application/x-refstack-compliance-bulk-file'

type BulkFileItem = {
  id: string
  file: File
  validUntil: string
  validUntilManuallyEdited: boolean
  extracting: boolean
  expiryAutoFilled: boolean
}

type BulkGroup = {
  id: string
  documentType: string
  title: string
  titleManuallyEdited: boolean
  typeManuallyEdited: boolean
  typeAutoFilled: boolean
  files: BulkFileItem[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function createFileItem(file: File): BulkFileItem {
  return {
    id: crypto.randomUUID(),
    file,
    validUntil: '',
    validUntilManuallyEdited: false,
    extracting: true,
    expiryAutoFilled: false,
  }
}

function createGroupForFile(
  file: File,
  typeOptions: ComplianceDocumentTypeOption[],
): BulkGroup {
  const inferredType =
    inferComplianceDocumentTypeFromUpload({ title: '', fileName: file.name }) ??
    'iso_27001'
  return {
    id: crypto.randomUUID(),
    documentType: inferredType,
    title: buildDefaultComplianceTitle(inferredType, typeOptions),
    titleManuallyEdited: false,
    typeManuallyEdited: false,
    typeAutoFilled: Boolean(inferredType),
    files: [createFileItem(file)],
  }
}

function autoGroupByDocumentType(incoming: BulkGroup[]): BulkGroup[] {
  const byType = new Map<string, BulkGroup>()

  for (const group of incoming) {
    const key = group.documentType
    const existing = byType.get(key)
    if (!existing) {
      byType.set(key, { ...group, files: [...group.files] })
      continue
    }
    byType.set(key, {
      ...existing,
      files: [...existing.files, ...group.files],
      typeAutoFilled: existing.typeAutoFilled || group.typeAutoFilled,
      title: existing.titleManuallyEdited
        ? existing.title
        : existing.title || group.title,
      titleManuallyEdited: existing.titleManuallyEdited,
      typeManuallyEdited: existing.typeManuallyEdited || group.typeManuallyEdited,
    })
  }

  return Array.from(byType.values())
}

export function ComplianceBulkUploadDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState<BulkGroup[]>([])
  const [typeOptions, setTypeOptions] = useState<ComplianceDocumentTypeOption[]>(() =>
    getSystemComplianceDocumentTypes(),
  )
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set())
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [draggingFileKey, setDraggingFileKey] = useState<string | null>(null)

  const totalFiles = useMemo(
    () => groups.reduce((sum, group) => sum + group.files.length, 0),
    [groups],
  )
  const hasFiles = groups.length > 0
  const canMergeSelected = selectedGroupIds.size >= 2
  const anyExtracting = groups.some((group) =>
    group.files.some((file) => file.extracting),
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
  }, [])

  const groupIdsKey = groups.map((g) => g.id).join(',')
  const [prevGroupIdsKey, setPrevGroupIdsKey] = useState(groupIdsKey)
  if (groupIdsKey !== prevGroupIdsKey) {
    setPrevGroupIdsKey(groupIdsKey)
    const valid = new Set(groups.map((g) => g.id))
    const next = new Set([...selectedGroupIds].filter((id) => valid.has(id)))
    if (next.size !== selectedGroupIds.size) {
      setSelectedGroupIds(next)
    }
  }

  function reset() {
    setGroups([])
    setTypeOptions(getSystemComplianceDocumentTypes())
    setSelectedGroupIds(new Set())
    setDragOverGroupId(null)
    setDraggingFileKey(null)
  }

  async function enrichAfterAdd(
    fileId: string,
    file: File,
    options: ComplianceDocumentTypeOption[],
  ) {
    const formData = new FormData()
    formData.set('file', file)
    const result = await extractComplianceCertificateMetadataFromPdf(formData)

    setGroups((prev) => {
      const hostIndex = prev.findIndex((g) => g.files.some((f) => f.id === fileId))
      if (hostIndex < 0) return prev

      const host = prev[hostIndex]!
      const updatedFiles = host.files.map((item) => {
        if (item.id !== fileId) return item
        let next = { ...item, extracting: false }
        if (!result.success) return next
        if (
          !item.validUntilManuallyEdited &&
          result.validUntil &&
          result.expiryConfidence !== 'none'
        ) {
          next = {
            ...next,
            validUntil: result.validUntil,
            expiryAutoFilled: true,
          }
        }
        return next
      })

      let updatedHost: BulkGroup = { ...host, files: updatedFiles }

      if (
        !host.typeManuallyEdited &&
        result.success &&
        result.documentType &&
        updatedFiles.length === 1
      ) {
        updatedHost = {
          ...updatedHost,
          documentType: result.documentType,
          typeAutoFilled: true,
          title: host.titleManuallyEdited
            ? host.title
            : buildDefaultComplianceTitle(result.documentType, options),
        }
      }

      const without = prev.filter((_, i) => i !== hostIndex)
      return autoGroupByDocumentType([...without, updatedHost])
    })
  }

  function addFiles(files: File[]) {
    const prepared = files.map((file) => createGroupForFile(file, typeOptions))
    const fileItems = prepared.flatMap((g) => g.files)

    setGroups((prev) => {
      const beforeCount = prev.length + prepared.length
      const next = autoGroupByDocumentType([...prev, ...prepared])
      if (beforeCount > next.length) {
        const autoGroupedCount = next
          .filter((g) => g.files.length > 1)
          .reduce((s, g) => s + g.files.length, 0)
        if (autoGroupedCount > 0) {
          toast.info(
            `${autoGroupedCount} Dateien wurden automatisch nach Zertifikatstyp gruppiert.`,
          )
        }
      }
      return next
    })

    for (const item of fileItems) {
      void enrichAfterAdd(item.id, item.file, typeOptions)
    }
  }

  function toggleGroupSelection(groupId: string, checked: boolean) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(groupId)
      else next.delete(groupId)
      return next
    })
  }

  function updateGroupTitle(groupId: string, title: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, title, titleManuallyEdited: true } : g,
      ),
    )
  }

  function handleDocumentTypeChange(groupId: string, slug: string) {
    setGroups((prev) => {
      const host = prev.find((g) => g.id === groupId)
      if (!host) return prev
      const updated: BulkGroup = {
        ...host,
        documentType: slug,
        typeManuallyEdited: true,
        typeAutoFilled: false,
        title: host.titleManuallyEdited
          ? host.title
          : buildDefaultComplianceTitle(slug, typeOptions),
      }
      const without = prev.filter((g) => g.id !== groupId)
      return autoGroupByDocumentType([...without, updated])
    })
  }

  function removeFile(groupId: string, fileIndex: number) {
    setGroups((prev) =>
      prev
        .map((g) =>
          g.id === groupId
            ? { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
            : g,
        )
        .filter((g) => g.files.length > 0),
    )
  }

  function moveFile(fromGroupId: string, fileIndex: number, toGroupId: string) {
    if (fromGroupId === toGroupId) return
    setGroups((prev) => {
      const source = prev.find((g) => g.id === fromGroupId)
      const target = prev.find((g) => g.id === toGroupId)
      const fileItem = source?.files[fileIndex]
      if (!source || !target || !fileItem) return prev

      return prev
        .map((g) => {
          if (g.id === fromGroupId) {
            return { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
          }
          if (g.id === toGroupId) {
            return { ...g, files: [...g.files, fileItem] }
          }
          return g
        })
        .filter((g) => g.files.length > 0)
    })
  }

  function mergeSelectedGroups(selectedIds: string[]) {
    if (selectedIds.length < 2) return
    setGroups((prev) => {
      const idSet = new Set(selectedIds)
      const selected = prev.filter((g) => idSet.has(g.id))
      if (selected.length < 2) return prev
      const rest = prev.filter((g) => !idSet.has(g.id))
      const primary = selected[0]!
      return [
        ...rest,
        {
          ...primary,
          files: selected.flatMap((g) => g.files),
        },
      ]
    })
  }

  function fileChipKey(groupId: string, item: BulkFileItem) {
    return `${groupId}:${item.id}`
  }

  function handleFileChipDragStart(
    event: React.DragEvent<HTMLDivElement>,
    groupId: string,
    fileIndex: number,
    chipKey: string,
  ) {
    if (saving) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(
      FILE_DRAG_MIME,
      JSON.stringify({ fromGroupId: groupId, fileIndex }),
    )
    event.dataTransfer.effectAllowed = 'move'
    setDraggingFileKey(chipKey)
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
      const raw = event.dataTransfer.getData(FILE_DRAG_MIME)
      if (!raw) return
      const payload = JSON.parse(raw) as { fromGroupId: string; fileIndex: number }
      if (!payload.fromGroupId || typeof payload.fileIndex !== 'number') return
      moveFile(payload.fromGroupId, payload.fileIndex, toGroupId)
    } catch {
      // ignore
    }
  }

  async function handleSubmit() {
    if (!totalFiles) {
      toast.error('Bitte mindestens eine PDF-Datei auswählen.')
      return
    }
    if (anyExtracting) {
      toast.error('Bitte warten, bis alle PDFs analysiert wurden.')
      return
    }

    const flat = groups.flatMap((group) =>
      group.files.map((item, indexInGroup) => ({
        title:
          group.files.length === 1
            ? group.title.trim()
            : `${group.title.trim()} (${indexInGroup + 1})`,
        documentType: group.documentType,
        validUntil: item.validUntil.trim() || null,
        file: item.file,
      })),
    )

    const invalid = flat.find((row) => !row.title.trim())
    if (invalid) {
      toast.error('Jedes Zertifikat braucht einen Titel.')
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.set(
      'manifest',
      JSON.stringify(
        flat.map((row, index) => ({
          title: row.title,
          documentType: row.documentType,
          validUntil: row.validUntil,
          fileIndex: index,
        })),
      ),
    )
    flat.forEach((row, index) => {
      formData.set(`file_${index}`, row.file)
    })

    const result = await uploadComplianceDocumentsBatch(formData)
    setSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    if (result.errors.length > 0) {
      toast.error(`${result.uploaded} gespeichert, ${result.errors.length} Fehler.`)
      log.error('complianceBulkUpload.partialErrors', {
        uploaded: result.uploaded,
        errors: result.errors,
      })
    } else {
      toast.success(
        `${result.uploaded} Zertifikat${result.uploaded !== 1 ? 'e' : ''} gespeichert.`,
      )
    }

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
        <DialogContent className={DIALOG_CLASS} showCloseButton={!saving}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 md:px-10 md:py-5">
            <DialogHeader className="shrink-0 space-y-1 text-left">
              <DialogTitle>Zertifikate importieren</DialogTitle>
              <DialogDescription>
                Lege PDFs ab. Dateien werden automatisch nach Zertifikatstyp gruppiert.
              </DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                'min-h-0 flex-1 pt-3',
                hasFiles ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
              )}
            >
              {!hasFiles ? (
                <ComplianceMultiPdfDropzone
                  onFilesSelected={addFiles}
                  disabled={saving || typesLoading}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
                  <div className="flex shrink-0 gap-3 border-b border-border bg-white px-3 py-2">
                    <div className="size-4 shrink-0" aria-hidden />
                    <div className={cn(ROW_GRID_CLASS, HEADER_CLASS)}>
                      <span>Zertifikatstyp</span>
                      <span>Titel</span>
                      <span>Dokumente</span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                    {groups.map((group) => {
                      const previewPending = group.files.some((f) => f.extracting)
                      return (
                        <div
                          key={group.id}
                          className="flex items-center gap-3 border-b border-border bg-white px-3 py-2.5 last:border-b-0"
                        >
                          <Checkbox
                            className="self-center"
                            checked={selectedGroupIds.has(group.id)}
                            disabled={saving}
                            onCheckedChange={(checked) =>
                              toggleGroupSelection(group.id, checked === true)
                            }
                            aria-label={`${group.title || 'Zertifikat'} auswählen`}
                          />

                          <div className={ROW_GRID_CLASS}>
                            <div className="min-w-0">
                              <ComplianceDocumentTypeCombobox
                                options={typeOptions}
                                value={group.documentType}
                                onValueChange={(slug) =>
                                  handleDocumentTypeChange(group.id, slug)
                                }
                                onOptionsChange={setTypeOptions}
                                disabled={saving || previewPending || typesLoading}
                                onManageTypesClick={() => setTypesDialogOpen(true)}
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <Input
                                value={group.title}
                                onChange={(e) =>
                                  updateGroupTitle(group.id, e.target.value)
                                }
                                disabled={saving || previewPending}
                                className="h-8 min-w-0 flex-1 text-sm"
                                placeholder="Titel"
                                aria-label="Zertifikatstitel"
                              />
                              {previewPending ? (
                                <RefreshCw
                                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                                  aria-hidden
                                />
                              ) : null}
                            </div>

                            <div
                              className={cn(
                                'flex min-h-9 min-w-0 flex-wrap gap-1.5 rounded-md transition-colors lg:justify-end',
                                dragOverGroupId === group.id &&
                                  'bg-primary/10 ring-1 ring-inset ring-primary/40',
                              )}
                              onDragOver={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                event.dataTransfer.dropEffect = 'move'
                                setDragOverGroupId(group.id)
                              }}
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
                              {group.files.map((item, fileIndex) => {
                                const chipKey = fileChipKey(group.id, item)
                                return (
                                  <div
                                    key={chipKey}
                                    draggable={!saving}
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
                                      {item.file.name}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => removeFile(group.id, fileIndex)}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                      aria-label={`${item.file.name} entfernen`}
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
              )}
            </div>

            <div className="shrink-0 border-t border-border py-3">
              <div className="flex items-center gap-3">
                {hasFiles ? (
                  <div className="min-w-0 flex-1">
                    <ComplianceMultiPdfDropzone
                      id="compliance-bulk-pdf-dropzone-more"
                      compact
                      onFilesSelected={addFiles}
                      disabled={saving || typesLoading}
                    />
                  </div>
                ) : (
                  <div className="flex-1" aria-hidden />
                )}

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="toolbar"
                    disabled={!canMergeSelected || saving}
                    onClick={() => {
                      mergeSelectedGroups(Array.from(selectedGroupIds))
                      setSelectedGroupIds(new Set())
                    }}
                  >
                    Ausgewählte gruppieren
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="toolbar"
                    disabled={saving}
                    onClick={() => onOpenChange(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    size="toolbar"
                    disabled={totalFiles === 0 || saving || anyExtracting}
                    onClick={() => void handleSubmit()}
                  >
                    {saving ? (
                      <>
                        <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                        Speichern…
                      </>
                    ) : anyExtracting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Analysiere…
                      </>
                    ) : (
                      'Import starten'
                    )}
                  </Button>
                </div>
              </div>
              {totalFiles > 0 ? (
                <p className="mt-1.5 text-right text-xs text-muted-foreground">
                  {groups.length} Typ{groups.length !== 1 ? 'en' : ''} · {totalFiles}{' '}
                  Datei
                  {totalFiles !== 1 ? 'en' : ''}
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ComplianceDocumentTypesDialog
        open={typesDialogOpen}
        onOpenChange={setTypesDialogOpen}
        onTypesChange={setTypeOptions}
      />
    </>
  )
}
