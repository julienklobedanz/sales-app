'use client'

import { Loader2 } from 'lucide-react'
import { Loader } from '@hugeicons/core-free-icons'

import { ComplianceMultiPdfDropzone } from '@/app/(app)/compliance/compliance-multi-pdf-dropzone'
import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'

export function ComplianceBulkUploadFooter({
  hasFiles,
  totalFiles,
  groupsCount,
  saving,
  typesLoading,
  anyExtracting,
  canMergeSelected,
  onAddFiles,
  onMergeSelected,
  onCancel,
  onSubmit,
}: {
  hasFiles: boolean
  totalFiles: number
  groupsCount: number
  saving: boolean
  typesLoading: boolean
  anyExtracting: boolean
  canMergeSelected: boolean
  onAddFiles: (files: File[]) => void
  onMergeSelected: () => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="shrink-0 border-t border-border py-3">
      <div className="flex items-center gap-3">
        {hasFiles ? (
          <div className="min-w-0 flex-1">
            <ComplianceMultiPdfDropzone
              id="compliance-bulk-pdf-dropzone-more"
              compact
              onFilesSelected={onAddFiles}
              disabled={saving || typesLoading}
            />
          </div>
        ) : (
          <div className="flex-1" aria-hidden />
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="toolbar"
            disabled={!canMergeSelected || saving}
            onClick={onMergeSelected}
          >
            Ausgewählte gruppieren
          </Button>
          <Button
            type="button"
            variant="outline"
            size="toolbar"
            disabled={saving}
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            size="toolbar"
            disabled={totalFiles === 0 || saving || anyExtracting}
            onClick={onSubmit}
          >
            {saving ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                Speichern…
              </>
            ) : anyExtracting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Analysiere…
              </>
            ) : (
              'Import starten'
            )}
          </Button>
        </div>
      </div>
      {totalFiles > 0 ? (
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {groupsCount} Typ{groupsCount !== 1 ? 'en' : ''} · {totalFiles} Datei
          {totalFiles !== 1 ? 'en' : ''}
        </p>
      ) : null}
    </div>
  )
}
