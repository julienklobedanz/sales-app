'use client'

import { useState } from 'react'
import { Download, Loader, Trash2, UploadIcon } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

import type { NdaAgreementRow } from '../nda-actions'
import { NdaPdfDropzone } from './nda-pdf-dropzone'
import { formatNdaValidUntil, ndaAgreementStatusLabel } from './nda-status-badge'

function agreementStatusDot(status: string) {
  if (status === 'active') return 'bg-emerald-500'
  if (status === 'pending') return 'bg-amber-500'
  if (status === 'expired') return 'bg-muted-foreground/50'
  return 'bg-muted-foreground/50'
}

export function NdaAgreementEntry({
  row,
  canManage,
  uploadOpen,
  onToggleUpload,
  uploading,
  downloading,
  fileInputRef,
  onFileSelected,
  onDownload,
  onDelete,
}: {
  row: NdaAgreementRow
  canManage: boolean
  uploadOpen: boolean
  onToggleUpload: () => void
  uploading: boolean
  downloading: boolean
  fileInputRef: (el: HTMLInputElement | null) => void
  onFileSelected: (file: File, meta: { version: string; signedAt: string }) => void
  onDownload: () => void
  onDelete: () => void
}) {
  const [version, setVersion] = useState(row.document_version ?? '')
  const [signedAt, setSignedAt] = useState(row.signed_at ?? '')
  const hasFile = Boolean(row.file_storage_path)

  return (
    <li>
      <Card className="gap-0 p-0">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'mt-1.5 size-2 shrink-0 rounded-full',
              agreementStatusDot(row.status),
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {row.title?.trim() || ndaAgreementStatusLabel(row.status)}
              <span className="font-normal text-muted-foreground">
                {' '}
                · {formatNdaValidUntil(row.valid_until)}
              </span>
            </p>
            {row.title?.trim() ? (
              <p className="text-[11px] text-muted-foreground">
                {ndaAgreementStatusLabel(row.status)}
              </p>
            ) : null}
            {row.notes ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.notes}</p>
            ) : null}
            {hasFile && row.file_name ? (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {row.file_name}
              </p>
            ) : !hasFile && canManage ? (
              <p className="mt-1 text-[11px] text-amber-700/90 dark:text-amber-400/90">
                Noch kein PDF hochgeladen
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {hasFile ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              disabled={downloading}
              onClick={onDownload}
            >
              <AppIcon
                icon={downloading ? Loader : Download}
                size={14}
                className="mr-1"
              />
              PDF
            </Button>
          ) : null}
          {canManage ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onToggleUpload}
              >
                <AppIcon icon={UploadIcon} size={14} className="mr-1" />
                {uploadOpen ? 'Schließen' : hasFile ? 'PDF ersetzen' : 'PDF hochladen'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <AppIcon icon={Trash2} size={14} className="mr-1" />
                Löschen
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {uploadOpen && canManage ? (
        <div className="space-y-3 border-t border-border/60 bg-muted/20 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Version (optional)
              </Label>
              <Input
                className="h-8 text-xs"
                placeholder="z. B. v2"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Dokumentdatum</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
          <NdaPdfDropzone
            id={`nda-upload-${row.id}`}
            file={null}
            onFileChange={(file) => {
              if (file) onFileSelected(file, { version, signedAt })
            }}
            disabled={uploading}
            uploading={uploading}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelected(file, { version, signedAt })
              e.target.value = ''
            }}
          />
        </div>
      ) : null}
      </Card>
    </li>
  )
}
