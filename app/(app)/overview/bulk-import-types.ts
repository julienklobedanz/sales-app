export type BulkImportGroupItem = {
  id: string
  projectName: string
  companyName?: string
  files: File[]
}

export const BULK_IMPORT_DIALOG_CLASS =
  'flex max-h-[min(90vh,920px)] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 sm:max-w-[90vw] lg:max-w-7xl'

export const BULK_IMPORT_ROW_GRID_CLASS =
  'grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(140px,220px)_minmax(0,1fr)_minmax(180px,34%)] lg:items-center lg:gap-4'

export const BULK_IMPORT_HEADER_CLASS = 'text-xs font-medium text-muted-foreground'

export const BULK_IMPORT_FILE_DRAG_MIME = 'application/x-refstack-bulk-import-file'

export function bulkImportFileChipKey(groupId: string, file: File): string {
  return `${groupId}:${file.name}:${file.size}:${file.lastModified}`
}
