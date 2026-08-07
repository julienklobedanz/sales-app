'use client'

import type { DragEvent, RefObject } from 'react'
import { UploadIcon } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { cn } from '@/lib/utils'

export function BulkImportDropzone({
  compact,
  loading,
  dropRef,
  onAddFiles,
}: {
  compact: boolean
  loading: boolean
  dropRef: RefObject<HTMLInputElement | null>
  onAddFiles: (files: File[]) => void
}) {
  function handleFileDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (loading) return
    const list = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : []
    onAddFiles(list)
  }

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
