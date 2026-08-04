import { toast } from 'sonner'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { autoGroupBulkImportByFileName } from '@/lib/references/bulk-import-grouping'
import type { BulkImportGroupItem } from './bulk-import-dialog'
import type { Dispatch, SetStateAction } from 'react'

export async function previewBulkImportFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch('/api/bulk-import/preview', { method: 'POST', body: formData })
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
  setBulkImportPreviewPendingFiles: Dispatch<SetStateAction<Set<File>>>
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
        `${autoGroupedCount} Dateien wurden automatisch gruppiert, da sie zum gleichen Kunden gehören.`
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
          })
        )
      })
    }

    return next
  })
}
