'use client'

import Link from 'next/link'
import { Loader, MoreHorizontal, PencilEdit01Icon } from '@hugeicons/core-free-icons'
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
import {
  isTenderOwnedDocument,
  type DocumentCardOwner,
} from '@/lib/deals/document-display'
import { ROUTES } from '@/lib/routes'

import type { DealDocumentRow as DealDocumentRowType } from '../document-actions'
import {
  formatDealDocumentFileSize,
  formatDealDocumentUploadedAt,
} from './deal-document-format'

export function DealDocumentRow({
  doc,
  owner,
  canManage,
  isRfpMode,
  analyzingId,
  downloadPendingId,
  onAnalyze,
  onDownload,
  onRenameRequest,
  onKindChange,
  onDeleteRequest,
  onAssignToTender,
  onAssignToDeal,
}: {
  doc: DealDocumentRowType
  owner: DocumentCardOwner
  canManage: boolean
  isRfpMode: boolean
  analyzingId: string | null
  downloadPendingId: string | null
  onAnalyze: (doc: DealDocumentRowType) => void
  onDownload: (doc: DealDocumentRowType) => void
  onRenameRequest: (doc: DealDocumentRowType) => void
  onKindChange: (doc: DealDocumentRowType, kind: DealDocumentKind) => void
  onDeleteRequest: (doc: DealDocumentRowType) => void
  onAssignToTender: (doc: DealDocumentRowType) => void
  onAssignToDeal: (doc: DealDocumentRowType, dealId: string) => void
}) {
  const inherited = owner.kind === 'deal' && isTenderOwnedDocument(doc)
  const canMutate = canManage && !inherited
  const showAssignToTender =
    canManage && owner.kind === 'deal' && owner.tenderId != null && !inherited
  const showAssignToThisLot = canManage && inherited && owner.kind === 'deal'
  const showAssignToLotMenu =
    canManage && owner.kind === 'tender' && owner.lots.length > 0

  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{doc.file_name}</span>
          <Badge variant="secondary">{DEAL_DOCUMENT_KIND_LABELS[doc.kind]}</Badge>
          {inherited ? (
            <Badge variant="outline" className="text-[10px]">
              {COPY.tenders.ownedByTender}
            </Badge>
          ) : null}
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
        {inherited && doc.tender_id ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" asChild>
            <Link
              href={ROUTES.tenders.detail(doc.tender_id)}
              aria-label={COPY.deals.cockpit.editInheritedDocument}
              title={COPY.deals.cockpit.editInheritedDocument}
            >
              <AppIcon icon={PencilEdit01Icon} size={14} />
            </Link>
          </Button>
        ) : null}
        {canManage &&
        (canMutate ||
          showAssignToTender ||
          showAssignToThisLot ||
          showAssignToLotMenu) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <AppIcon icon={MoreHorizontal} size={16} />
                <span className="sr-only">Aktionen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMutate ? (
                <>
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
                </>
              ) : null}
              {showAssignToTender ? (
                <DropdownMenuItem onSelect={() => onAssignToTender(doc)}>
                  {COPY.deals.cockpit.assignDocumentToTender}
                </DropdownMenuItem>
              ) : null}
              {showAssignToThisLot && owner.kind === 'deal' ? (
                <DropdownMenuItem onSelect={() => onAssignToDeal(doc, owner.id)}>
                  {COPY.deals.cockpit.assignDocumentToDeal}
                </DropdownMenuItem>
              ) : null}
              {showAssignToLotMenu && owner.kind === 'tender' ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {COPY.deals.cockpit.assignDocumentToDeal}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {owner.lots.map((lot) => (
                      <DropdownMenuItem
                        key={lot.id}
                        onSelect={() => onAssignToDeal(doc, lot.id)}
                      >
                        {lot.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              {canMutate ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onDeleteRequest(doc)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {COPY.deals.cockpit.documentsDelete}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  )
}
