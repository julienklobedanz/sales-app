'use client'

import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { log } from '@/lib/observability/logger'

import {
  extractComplianceCertificateMetadataFromPdf,
  uploadComplianceDocumentsBatch,
} from '@/app/(app)/settings/compliance-actions'
import { listComplianceDocumentTypeOptions } from '@/app/(app)/settings/compliance-document-type-actions'
import {
  getSystemComplianceDocumentTypes,
  type ComplianceDocumentTypeOption,
} from '@/lib/compliance/document-types'
import { buildDefaultComplianceTitle } from '@/lib/compliance/upload-filename'

import {
  autoGroupByDocumentType,
  createGroupForFile,
  fileChipKey,
} from './compliance-bulk-upload-helpers'
import {
  FILE_DRAG_MIME,
  type BulkGroup,
} from './compliance-bulk-upload-types'

export function useComplianceBulkUpload(onOpenChange: (open: boolean) => void) {
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

  function handleFileChipDragStart(
    event: DragEvent<HTMLDivElement>,
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

  function handleDocumentsDrop(event: DragEvent<HTMLDivElement>, toGroupId: string) {
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

  function mergeSelectedAndClear() {
    mergeSelectedGroups(Array.from(selectedGroupIds))
    setSelectedGroupIds(new Set())
  }

  return {
    groups,
    typeOptions,
    setTypeOptions,
    typesLoading,
    typesDialogOpen,
    setTypesDialogOpen,
    saving,
    selectedGroupIds,
    dragOverGroupId,
    setDragOverGroupId,
    draggingFileKey,
    setDraggingFileKey,
    totalFiles,
    hasFiles,
    canMergeSelected,
    anyExtracting,
    loadTypes,
    reset,
    addFiles,
    toggleGroupSelection,
    updateGroupTitle,
    handleDocumentTypeChange,
    removeFile,
    fileChipKey,
    handleFileChipDragStart,
    handleDocumentsDrop,
    handleSubmit,
    mergeSelectedAndClear,
  }
}
