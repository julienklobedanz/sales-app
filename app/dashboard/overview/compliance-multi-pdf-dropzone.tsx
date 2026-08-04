'use client'

import { useRef, useState } from 'react'
import { UploadIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function ComplianceMultiPdfDropzone({
  onFilesSelected,
  disabled = false,
  id = 'compliance-bulk-pdf-dropzone',
  compact = false,
}: {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  id?: string
  /** Kompakte Variante für den Dialog-Footer (wie Referenzen-Import). */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function acceptFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList?.length) return
    const pdfs = Array.from(fileList).filter(isPdfFile)
    const rejected = Array.from(fileList).length - pdfs.length
    if (rejected > 0) {
      toast.error(`${rejected} Datei(en) übersprungen — nur PDF erlaubt.`)
    }
    if (!pdfs.length) return
    onFilesSelected(pdfs)
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        'flex w-full min-w-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors',
        dragOver && !disabled
          ? 'border-primary/50 bg-primary/5'
          : 'border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30',
        disabled ? 'pointer-events-none cursor-not-allowed opacity-60' : '',
        compact
          ? 'h-10 gap-2 px-3 text-left text-xs sm:text-sm'
          : 'min-h-[160px] flex-col gap-2 p-6 text-center',
      )}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        if (disabled) return
        acceptFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <AppIcon
        icon={UploadIcon}
        size={compact ? 16 : 32}
        className="shrink-0 text-muted-foreground"
      />
      {compact ? (
        <span className="min-w-0 truncate text-muted-foreground">
          Weitere Dateien ablegen oder klicken
        </span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">
            PDFs hierher ziehen oder klicken zum Auswählen
          </p>
          <p className="text-xs text-muted-foreground">
            Mehrere Zertifikate gleichzeitig · max. 20 MB je Datei
          </p>
        </div>
      )}
    </div>
  )
}
