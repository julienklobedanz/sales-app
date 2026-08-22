'use client'

import type { DragEvent, RefObject } from 'react'
import { UploadIcon } from '@hugeicons/core-free-icons'

import { Ablage } from '@/components/ui/ablage'
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
    <Ablage
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
        'flex w-full min-w-0 items-center justify-center text-muted-foreground',
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
    </Ablage>
  )
}
