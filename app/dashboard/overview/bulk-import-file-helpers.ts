import { toast } from 'sonner'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { autoGroupBulkImportByFileName } from '@/lib/references/bulk-import-grouping'
import type { BulkImportGroupItem } from './bulk-import-types'
import type { Dispatch, SetStateAction } from 'react'

async function previewBulkImportFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch('/api/bulk-import/preview', {
      method: 'POST',
      body: formData,
    })
    const json = (await res.json()) as {
      success?: boolean
      projectName?: string
      companyName?: string | null
    }
    if (json.success && json.projectName?.trim()) {
      return {
        projectName: json.projectName.trim(),
        companyName: json.companyName?.trim() || undefined,
      }
    }
  } catch {
    // Vorschau optional — Dateiname als Fallback
  }
  return {
    projectName: file.name.replace(/\.[^.]+$/, '').trim() || file.name,
    companyName: undefined as string | undefined,
  }
}

export function addBulkImportFiles(
  newFiles: File[],
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
  setBulkImportPreviewPendingFiles: Dispatch<SetStateAction<Set<File>>>,
) {
  setBulkImportGroups((prev) => {
    const currentTotal = prev.reduce((s, g) => s + g.files.length, 0)
    const capped = newFiles.slice(0, Math.max(0, BULK_IMPORT_MAX_FILES - currentTotal))
    if (capped.length === 0) return prev
    const newGroups: BulkImportGroupItem[] = capped.map((file) => ({
      id: `g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      projectName: file.name.replace(/\.[^.]+$/, '').trim() || file.name,
      files: [file],
    }))
    const next = autoGroupBulkImportByFileName([...prev, ...newGroups])
    const autoGroupedCount = next
      .filter((g) => g.files.length > 1)
      .reduce((s, g) => s + g.files.length, 0)
    if (autoGroupedCount > 0) {
      toast.info(
        `${autoGroupedCount} Dateien wurden automatisch gruppiert, da sie zum gleichen Kunden gehören.`,
      )
    }

    for (const file of capped) {
      setBulkImportPreviewPendingFiles((prevPending) => new Set(prevPending).add(file))
      void previewBulkImportFile(file).then((meta) => {
        setBulkImportPreviewPendingFiles((prevPending) => {
          const nextPending = new Set(prevPending)
          nextPending.delete(file)
          return nextPending
        })
        setBulkImportGroups((current) =>
          current.map((g) => {
            if (!g.files.includes(file)) return g
            return {
              ...g,
              projectName: meta.projectName || g.projectName,
              companyName: meta.companyName ?? g.companyName,
            }
          }),
        )
      })
    }

    return next
  })
}

export function removeBulkImportFile(
  groupId: string,
  fileIndex: number,
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
) {
  setBulkImportGroups((prev) =>
    prev
      .map((g) =>
        g.id === groupId ? { ...g, files: g.files.filter((_, i) => i !== fileIndex) } : g,
      )
      .filter((g) => g.files.length > 0),
  )
}

export function moveBulkImportFile(
  fromGroupId: string,
  fileIndex: number,
  toGroupId: string,
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
) {
  if (fromGroupId === toGroupId) return
  setBulkImportGroups((prev) => {
    const sourceGroup = prev.find((g) => g.id === fromGroupId)
    const file = sourceGroup?.files[fileIndex]
    if (!sourceGroup || !file) return prev
    if (!prev.some((g) => g.id === toGroupId)) return prev

    return prev
      .map((g) => {
        if (g.id === fromGroupId) {
          return { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
        }
        if (g.id === toGroupId) {
          return { ...g, files: [...g.files, file] }
        }
        return g
      })
      .filter((g) => g.files.length > 0)
  })
}

export function setBulkImportGroupName(
  groupId: string,
  projectName: string,
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
) {
  setBulkImportGroups((prev) =>
    prev.map((g) => (g.id === groupId ? { ...g, projectName } : g)),
  )
}

export function setBulkImportCompanyName(
  groupId: string,
  companyName: string,
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
) {
  setBulkImportGroups((prev) =>
    prev.map((g) =>
      g.id === groupId ? { ...g, companyName: companyName.trim() || undefined } : g,
    ),
  )
}

export function mergeBulkImportGroups(
  selectedIds: string[],
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>,
) {
  if (selectedIds.length < 2) return
  setBulkImportGroups((prev) => {
    const idSet = new Set(selectedIds)
    const selected = prev.filter((g) => idSet.has(g.id))
    if (selected.length < 2) return prev
    const rest = prev.filter((g) => !idSet.has(g.id))
    const primary = selected[0]!
    const mergedCompany =
      primary.companyName?.trim() ||
      selected.find((g) => g.companyName?.trim())?.companyName?.trim()
    return [
      ...rest,
      {
        ...primary,
        companyName: mergedCompany || undefined,
        files: selected.flatMap((g) => g.files),
      },
    ]
  })
}
