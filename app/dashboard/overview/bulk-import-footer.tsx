'use client'

import type { RefObject } from 'react'
import { Loader } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'

import { BulkImportDropzone } from './bulk-import-dropzone'

export function BulkImportFooter({
  hasFiles,
  totalFiles,
  groupsCount,
  loading,
  canMergeSelected,
  extractionProgress,
  dropRef,
  onAddFiles,
  onMergeSelected,
  onCancel,
  onSubmit,
}: {
  hasFiles: boolean
  totalFiles: number
  groupsCount: number
  loading: boolean
  canMergeSelected: boolean
  extractionProgress: { current: number; total: number } | null
  dropRef: RefObject<HTMLInputElement | null>
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
            <BulkImportDropzone
              compact
              loading={loading}
              dropRef={dropRef}
              onAddFiles={onAddFiles}
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
            disabled={!canMergeSelected || loading}
            onClick={onMergeSelected}
          >
            Ausgewählte gruppieren
          </Button>
          <Button
            variant="outline"
            size="toolbar"
            disabled={loading}
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button
            size="toolbar"
            disabled={totalFiles === 0 || loading}
            onClick={onSubmit}
          >
            {loading ? (
              <>
                <AppIcon icon={Loader} size={16} className="mr-2 animate-spin" />
                {extractionProgress
                  ? `Extrahiere ${extractionProgress.current}/${extractionProgress.total}…`
                  : 'Import läuft…'}
              </>
            ) : (
              'Import starten'
            )}
          </Button>
        </div>
      </div>
      {totalFiles > 0 ? (
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {groupsCount} Gruppe{groupsCount !== 1 ? 'n' : ''} · {totalFiles} Datei
          {totalFiles !== 1 ? 'en' : ''}
        </p>
      ) : null}
    </div>
  )
}
