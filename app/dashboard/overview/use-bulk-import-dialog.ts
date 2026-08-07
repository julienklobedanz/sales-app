'use client'

import {
  useEffect,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { bulkCreateReferencesFromFiles } from '@/app/dashboard/actions'
import { extractBulkImportReferenceFromFile } from '@/lib/references/bulk-import-extract-client'
import { uploadBulkImportFilesForReference } from '@/lib/references/bulk-import-upload'
import { runBulkImportExtractionForReference } from '@/lib/references/library/bulk-import-post-process'
import type { BulkImportExtractionResult } from '@/lib/references/bulk-import-review-types'
import { createClient } from '@/lib/supabase/client'

import type { BulkImportReviewItem } from './bulk-import-review-dialog'
import {
  BULK_IMPORT_FILE_DRAG_MIME,
  bulkImportFileChipKey,
  type BulkImportGroupItem,
} from './bulk-import-types'

export function useBulkImportDialog({
  open,
  onOpenChange,
  loading,
  onLoadingChange,
  groups,
  setGroups,
  moveFile,
  setCompanyName,
  mergeSelectedGroups,
  previewPendingFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onLoadingChange?: (loading: boolean) => void
  groups: BulkImportGroupItem[]
  setGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>
  moveFile: (fromGroupId: string, fileIndex: number, toGroupId: string) => void
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
  const canMergeSelected = selectedGroupIds.size >= 2

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

  function cancelCompanyEdit() {
    setEditingCompanyId(null)
    setCompanyDraft('')
  }

  function isGroupPreviewPending(group: BulkImportGroupItem) {
    return group.files.some((file) => previewPendingFiles.has(file))
  }

  function handleFileChipDragStart(
    event: DragEvent<HTMLDivElement>,
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

  function handleDocumentsDragOver(event: DragEvent<HTMLDivElement>, groupId: string) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDragOverGroupId(groupId)
  }

  function handleDocumentsDrop(event: DragEvent<HTMLDivElement>, toGroupId: string) {
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
            if (!upload.success) {
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

  function mergeSelectedAndClear() {
    mergeSelectedGroups(Array.from(selectedGroupIds))
    setSelectedGroupIds(new Set())
  }

  return {
    totalFiles,
    hasFiles,
    canMergeSelected,
    reviewOpen,
    setReviewOpen,
    reviewItems,
    extractionProgress,
    selectedGroupIds,
    editingCompanyId,
    companyDraft,
    setCompanyDraft,
    dragOverGroupId,
    setDragOverGroupId,
    draggingFileKey,
    setDraggingFileKey,
    toggleGroupSelection,
    startCompanyEdit,
    commitCompanyEdit,
    cancelCompanyEdit,
    isGroupPreviewPending,
    fileChipKey: bulkImportFileChipKey,
    handleFileChipDragStart,
    handleDocumentsDragOver,
    handleDocumentsDrop,
    handleImport,
    mergeSelectedAndClear,
  }
}
