'use client'

import { useRef, useState } from 'react'
import { UploadIcon, Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function titleFromPdfFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, '').trim()
}

export function NdaPdfDropzone({
  file,
  onFileChange,
  disabled = false,
  uploading = false,
  id = 'nda-pdf-dropzone',
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  uploading?: boolean
  id?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const busy = disabled || uploading

  function acceptFile(next: File | undefined) {
    if (!next) return
    if (!isPdfFile(next)) {
      toast.error('Nur PDF-Dateien sind erlaubt.')
      return
    }
    onFileChange(next)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Vertragsdokument (PDF)</Label>
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        className={cn(
          'w-full rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver && !busy
            ? 'border-violet-400 bg-violet-50/50'
            : 'border-slate-200 bg-slate-50/40',
          busy
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/80',
        )}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (busy) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!busy) setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!busy) setDragOver(true)
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
          if (busy) return
          acceptFile(e.dataTransfer.files?.[0])
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <AppIcon icon={Loader} size={20} className="animate-spin" />
            PDF wird hochgeladen …
          </div>
        ) : file ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB · Klicken oder ziehen zum Ersetzen
            </p>
            <button
              type="button"
              className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                onFileChange(null)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Entfernen
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <AppIcon
              icon={UploadIcon}
              size={22}
              className="text-muted-foreground"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">PDF hierher ziehen</p>
            <p className="text-xs text-muted-foreground">
              oder klicken zum Auswählen · max. 20 MB
            </p>
          </div>
        )}
      </div>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
