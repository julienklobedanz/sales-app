import type { ComplianceDocumentTypeOption } from '@/lib/compliance/document-types'
import { inferComplianceDocumentTypeFromUpload } from '@/lib/compliance/document-icon'
import { buildDefaultComplianceTitle } from '@/lib/compliance/upload-filename'

import type { BulkFileItem, BulkGroup } from './compliance-bulk-upload-types'

export function createFileItem(file: File): BulkFileItem {
  return {
    id: crypto.randomUUID(),
    file,
    validUntil: '',
    validUntilManuallyEdited: false,
    extracting: true,
    expiryAutoFilled: false,
  }
}

export function createGroupForFile(
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

export function autoGroupByDocumentType(incoming: BulkGroup[]): BulkGroup[] {
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

export function fileChipKey(groupId: string, item: BulkFileItem): string {
  return `${groupId}:${item.id}`
}
