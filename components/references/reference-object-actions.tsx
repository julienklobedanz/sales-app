'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  FileDownIcon,
  LinkIcon,
  MoreHorizontal,
  Pencil,
} from '@hugeicons/core-free-icons'

import { PdfExportDialog } from '@/app/dashboard/references/[id]/pdf-export-dialog'
import { ShareLinkButton } from '@/app/dashboard/references/[id]/share-link-button'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header)
  return m?.[1]?.trim() ?? null
}

async function downloadPptx(referenceId: string) {
  const res = await fetch(
    `/api/reference-onepager-pptx?referenceId=${encodeURIComponent(referenceId)}`,
    { method: 'GET', credentials: 'same-origin' },
  )
  if (!res.ok) {
    let msg = 'Export fehlgeschlagen.'
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const blob = await res.blob()
  const fallback = `RefStack_Onepager_${referenceId.slice(0, 8)}.pptx`
  const fromHeader = parseFilenameFromContentDisposition(
    res.headers.get('Content-Disposition'),
  )
  const fileName = fromHeader
    ? decodeURIComponent(fromHeader.replace(/^"|"$/g, ''))
    : fallback
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReferenceObjectActions({
  referenceId,
  canEdit,
  canDelete,
  editHref,
  existingSharePath,
  onDelete,
  children,
}: {
  referenceId: string
  canEdit?: boolean
  canDelete?: boolean
  editHref?: string | null
  existingSharePath?: string | null
  onDelete?: () => void | Promise<unknown>
  children?: ReactNode
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pptxPending, setPptxPending] = useState(false)

  function openCustomerLink() {
    if (!existingSharePath) return
    const path = existingSharePath.startsWith('/')
      ? existingSharePath
      : `/${existingSharePath}`
    window.open(path, '_blank', 'noopener,noreferrer')
  }

  async function onExportPptx() {
    setPptxPending(true)
    try {
      await downloadPptx(referenceId)
      toast.success('PowerPoint One-Pager wurde heruntergeladen.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Netzwerkfehler beim Export.')
    } finally {
      setPptxPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <AppIcon icon={LinkIcon} size={16} />
            Teilen
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>Kundenlink</DropdownMenuItem>
          {existingSharePath ? (
            <DropdownMenuItem onSelect={() => openCustomerLink()}>
              Kundenlink öffnen
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareLinkButton
        referenceId={referenceId}
        open={shareOpen}
        onOpenChange={setShareOpen}
        showTriggerButton={false}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={pptxPending}>
            <AppIcon icon={FileDownIcon} size={16} />
            Exportieren
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setPdfOpen(true)}>
            {COPY.references.exportAsPdf}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void onExportPptx()}>
            {pptxPending
              ? COPY.references.exportAsPptxPending
              : COPY.references.exportAsPptx}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PdfExportDialog
        referenceId={referenceId}
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        showTriggerButton={false}
      />

      {canEdit && editHref ? (
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={editHref}>
            <AppIcon icon={Pencil} size={16} />
            Bearbeiten
          </Link>
        </Button>
      ) : null}

      {children ? <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div> : null}

      {canDelete && onDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8" aria-label="Weitere Aktionen">
              <AppIcon icon={MoreHorizontal} size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete()}>
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
