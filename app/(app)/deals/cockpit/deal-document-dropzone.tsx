'use client'

import { useRef, useState } from 'react'
import { UploadIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Ablage } from '@/components/ui/ablage'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealDocumentKind } from '@/lib/deals/deal-document-kinds'
import { validateDealDocumentUpload } from '@/lib/deals/deal-document-upload'

import { formatDealDocumentFileSize } from './deal-document-format'

export function DealDocumentDropzone({
  file,
  kind,
  onFileChange,
  disabled,
}: {
  file: File | null
  kind: DealDocumentKind
  onFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function acceptFile(next: File | undefined) {
    if (!next) return
    const validation = validateDealDocumentUpload(next, kind)
    if (!validation.success) {
      toast.error(validation.error)
      return
    }
    onFileChange(next)
  }

  return (
    <Ablage
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      state={disabled ? 'disabled' : dragOver ? 'active' : 'rest'}
      className="w-full px-4 py-6 text-center"
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
        if (!disabled) setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (disabled) return
        acceptFile(e.dataTransfer.files?.[0])
      }}
    >
      {file ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDealDocumentFileSize(file.size)} ·{' '}
            {COPY.deals.cockpit.documentsDropzoneReplace}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <AppIcon icon={UploadIcon} size={20} />
          {COPY.deals.cockpit.documentsDropzoneHint}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </Ablage>
  )
}
