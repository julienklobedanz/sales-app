import type { ComplianceDocumentTypeOption } from '@/lib/compliance/document-types'

export const DIALOG_CLASS =
  'flex max-h-[min(90vh,920px)] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-[90vw] lg:max-w-7xl'

export const ROW_GRID_CLASS =
  'grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(160px,240px)_minmax(0,1fr)_minmax(180px,34%)] lg:items-center lg:gap-4'

export const HEADER_CLASS = 'text-xs font-medium text-muted-foreground'

export const FILE_DRAG_MIME = 'application/x-refstack-compliance-bulk-file'

export type BulkFileItem = {
  id: string
  file: File
  validUntil: string
  validUntilManuallyEdited: boolean
  extracting: boolean
  expiryAutoFilled: boolean
}

export type BulkGroup = {
  id: string
  documentType: string
  title: string
  titleManuallyEdited: boolean
  typeManuallyEdited: boolean
  typeAutoFilled: boolean
  files: BulkFileItem[]
}

export type ComplianceBulkUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export type { ComplianceDocumentTypeOption }
