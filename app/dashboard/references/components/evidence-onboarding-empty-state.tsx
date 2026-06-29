'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const ACCEPTED_EXTENSIONS = ['.pdf', '.pptx', '.ppt']
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
])

function isAcceptedReferenceFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return true
  return ACCEPTED_MIME_TYPES.has(file.type)
}

function filterAcceptedFiles(files: FileList | File[]): File[] {
  const list = Array.from(files)
  const accepted = list.filter(isAcceptedReferenceFile)
  if (accepted.length < list.length) {
    toast.error('Nur PDF- und PPTX-Dateien werden unterstützt.')
  }
  return accepted
}

type EvidenceOnboardingEmptyStateProps = {
  canCreate?: boolean
  onUploadFiles?: (files: File[]) => void
  onCreateManual?: () => void
}

export function EvidenceOnboardingEmptyState({
  canCreate = true,
  onUploadFiles,
  onCreateManual,
}: EvidenceOnboardingEmptyStateProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (files: File[]) => {
      const accepted = filterAcceptedFiles(files)
      if (accepted.length === 0) return
      if (onUploadFiles) {
        onUploadFiles(accepted)
        return
      }
      toast.info('Bitte lade dein Dokument auf der Referenz-Seite hoch.')
    },
    [onUploadFiles]
  )

  const openFilePicker = () => {
    if (!canCreate) return
    if (onUploadFiles) {
      inputRef.current?.click()
      return
    }
    router.push(ROUTES.evidence.new)
  }

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Importiere deine Referenzen auf Autopilot
      </h2>
      <p className="mx-auto mb-8 max-w-lg text-center text-sm text-gray-500">
        Lade eine oder mehrere bestehende Case Studies oder Projekt-Folien (PDF, PPTX) hoch.
        RefStack extrahiert die Daten, strukturiert sie und erstellt daraus sofort nutzbare
        Referenzen für euren Vertrieb — alles an einem Ort.
      </p>

      {canCreate ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.pptx,.ppt"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files
              if (files?.length) handleFiles(Array.from(files))
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={openFilePicker}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOver(true)
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
              if (!onUploadFiles) return
              if (e.dataTransfer.files.length > 0) {
                handleFiles(Array.from(e.dataTransfer.files))
              }
            }}
            className={cn(
              'group mb-6 flex w-full max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-10 transition-colors hover:bg-blue-50',
              dragOver && 'border-blue-400 bg-blue-50'
            )}
          >
            <UploadCloud
              className="mb-4 h-12 w-12 text-blue-600 transition-transform group-hover:scale-105"
              aria-hidden
            />
            <span className="font-semibold text-blue-900">
              Klicke hier oder ziehe Dateien (PDF, PPTX) hinein
            </span>
          </button>

          <div className="flex items-center justify-center gap-4 text-sm">
            {onCreateManual ? (
              <button
                type="button"
                onClick={onCreateManual}
                className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Erste Referenz manuell anlegen
              </button>
            ) : (
              <Link
                href={ROUTES.evidence.new}
                className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Erste Referenz manuell anlegen
              </Link>
            )}
          </div>
        </>
      ) : (
        <p className="max-w-md text-center text-sm text-gray-500">
          Noch keine freigegebenen Referenzen in deinem Workspace. Bitte dein Team, eine Referenz
          anzulegen oder freizugeben.
        </p>
      )}
    </div>
  )
}
