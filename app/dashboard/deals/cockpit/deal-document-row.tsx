'use client'

import { Loader, MoreHorizontal } from '@hugeicons/core-free-icons'
import { Download, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import {
  DEAL_DOCUMENT_KINDS,
  DEAL_DOCUMENT_KIND_LABELS,
  type DealDocumentKind,
} from '@/lib/deals/deal-document-kinds'

import type { DealDocumentRow as DealDocumentRowType } from '../document-actions'
import {
  formatDealDocumentFileSize,
  formatDealDocumentUploadedAt,
} from './deal-document-format'

export function DealDocumentRow({
  doc,
  canManage,
  isRfpMode,
  analyzingId,
  downloadPendingId,
  onAnalyze,
  onDownload,
  onRenameRequest,
  onKindChange,
  onDeleteRequest,
}: {
  doc: DealDocumentRowType
  canManage: boolean
  isRfpMode: boolean
  analyzingId: string | null
  downloadPendingId: string | null
  onAnalyze: (doc: DealDocumentRowType) => void
  onDownload: (doc: DealDocumentRowType) => void
  onRenameRequest: (doc: DealDocumentRowType) => void
  onKindChange: (doc: DealDocumentRowType, kind: DealDocumentKind) => void
  onDeleteRequest: (doc: DealDocumentRowType) => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{doc.file_name}</span>
          <Badge variant="secondary">{DEAL_DOCUMENT_KIND_LABELS[doc.kind]}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDealDocumentFileSize(doc.size_bytes)}
          {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
          {` · ${formatDealDocumentUploadedAt(doc.created_at)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {canManage && !isRfpMode && doc.kind === 'ausschreibung' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={analyzingId === doc.id}
            onClick={() => onAnalyze(doc)}
          >
            {analyzingId === doc.id ? (
              <>
                <AppIcon icon={Loader} size={14} className="mr-1 animate-spin" />
                {COPY.deals.cockpit.documentsAnalyzePending}
              </>
            ) : (
              COPY.deals.cockpit.documentsAnalyze
            )}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={downloadPendingId === doc.id}
          onClick={() => onDownload(doc)}
        >
          {downloadPendingId === doc.id ? (
            <AppIcon icon={Loader} size={16} className="animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="sr-only">{COPY.deals.cockpit.documentsDownload}</span>
        </Button>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <AppIcon icon={MoreHorizontal} size={16} />
                <span className="sr-only">Aktionen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onRenameRequest(doc)}>
                {COPY.deals.cockpit.documentsRename}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {COPY.deals.cockpit.documentsChangeKind}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {DEAL_DOCUMENT_KINDS.map((kind) => (
                    <DropdownMenuItem
                      key={kind}
                      disabled={kind === doc.kind}
                      onSelect={() => onKindChange(doc, kind)}
                    >
                      {DEAL_DOCUMENT_KIND_LABELS[kind]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDeleteRequest(doc)}
              >
                <Trash2 className="mr-2 size-4" />
                {COPY.deals.cockpit.documentsDelete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  )
}
