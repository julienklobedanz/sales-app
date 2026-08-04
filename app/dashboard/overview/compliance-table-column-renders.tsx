'use client'

import type * as React from 'react'
import { Download, Loader2 } from 'lucide-react'

import type { ComplianceDocumentRow } from '@/app/dashboard/settings/compliance-actions'
import { ComplianceDocumentTypeIcon } from '@/app/dashboard/overview/compliance-document-type-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell } from '@/components/ui/table'
import { TableDataCell, TableRowAlign } from '@/components/table/table-row-align'
import { DraggableColumnHead } from '@/components/table/draggable-column-head'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { isComplianceDocumentExpired } from '@/lib/compliance/expiry'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'
import { formatReferenceDate } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from '@hugeicons/core-free-icons'

export const COMPLIANCE_COLUMN_KEYS = [
  'title',
  'document_type',
  'valid_until',
  'status',
  'updated_at',
] as const

export type ComplianceColumnKey = (typeof COMPLIANCE_COLUMN_KEYS)[number]

export const COMPLIANCE_COLUMN_LABELS: Record<ComplianceColumnKey, string> = {
  document_type: 'Typ',
  title: 'Titel',
  valid_until: 'Gültig bis',
  status: 'Status',
  updated_at: 'Aktualisiert',
}

export type ComplianceTableHeaderRenderContext = {
  dragOverColumn: string | null
  setDragOverColumn: (key: string | null) => void
  moveColumnOrder: (from: string, to: string) => void
  sortKey: ComplianceColumnKey | null
  sortDir: 'asc' | 'desc'
  handleSort: (column: ComplianceColumnKey) => void
}

export type ComplianceTableCellRenderContext = {
  resolvingId: string | null
  onOpenPdf: (doc: ComplianceDocumentRow) => void
  onDownload: (doc: ComplianceDocumentRow) => void
}

function SortableHeaderButton({
  column,
  label,
  sortKey,
  sortDir,
  handleSort,
  className,
}: {
  column: ComplianceColumnKey
  label: string
  sortKey: ComplianceColumnKey | null
  sortDir: 'asc' | 'desc'
  handleSort: (column: ComplianceColumnKey) => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-0.5 hover:opacity-80 ${className ?? ''}`}
      onClick={() => handleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortDir === 'asc' ? (
          <AppIcon icon={ArrowUp} size={14} className="text-primary" />
        ) : (
          <AppIcon icon={ArrowDown} size={14} className="text-primary" />
        )
      ) : (
        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
      )}
    </button>
  )
}

export function renderComplianceColumnHeader(
  column: ComplianceColumnKey,
  ctx: ComplianceTableHeaderRenderContext
): React.ReactNode {
  const { dragOverColumn, setDragOverColumn, moveColumnOrder, sortKey, sortDir, handleSort } =
    ctx

  const dragProps = {
    columnKey: column,
    dragOverColumn,
    onDragOverColumn: setDragOverColumn,
    onColumnMove: moveColumnOrder,
  }

  switch (column) {
    case 'title':
      return (
        <DraggableColumnHead {...dragProps} className="min-w-[180px]">
          <SortableHeaderButton
            column="title"
            label={COMPLIANCE_COLUMN_LABELS.title}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
          />
        </DraggableColumnHead>
      )
    case 'document_type':
      return (
        <DraggableColumnHead {...dragProps}>
          <SortableHeaderButton
            column="document_type"
            label={COMPLIANCE_COLUMN_LABELS.document_type}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
          />
        </DraggableColumnHead>
      )
    case 'valid_until':
      return (
        <DraggableColumnHead {...dragProps}>
          <SortableHeaderButton
            column="valid_until"
            label={COMPLIANCE_COLUMN_LABELS.valid_until}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
          />
        </DraggableColumnHead>
      )
    case 'status':
      return (
        <DraggableColumnHead {...dragProps}>
          <SortableHeaderButton
            column="status"
            label={COMPLIANCE_COLUMN_LABELS.status}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
          />
        </DraggableColumnHead>
      )
    case 'updated_at':
      return (
        <DraggableColumnHead {...dragProps} contentAlign="end">
          <SortableHeaderButton
            column="updated_at"
            label={COMPLIANCE_COLUMN_LABELS.updated_at}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
          />
        </DraggableColumnHead>
      )
    default:
      return null
  }
}

export function renderComplianceColumnCell(
  column: ComplianceColumnKey,
  doc: ComplianceDocumentRow,
  ctx: ComplianceTableCellRenderContext
): React.ReactNode {
  const expired = isComplianceDocumentExpired(doc.valid_until)

  switch (column) {
    case 'title':
      return (
        <TableDataCell className="min-w-[180px] font-medium text-slate-900">
          <span className="flex min-w-0 items-center gap-3">
            <ComplianceDocumentTypeIcon
              documentType={doc.document_type}
              title={doc.title}
              fileName={doc.file_name}
            />
            {doc.file_storage_path ? (
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left leading-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                data-compliance-skip-row-click
                onClick={() => ctx.onOpenPdf(doc)}
              >
                {doc.title}
              </button>
            ) : (
              <span className="min-w-0 flex-1 truncate leading-none">{doc.title}</span>
            )}
          </span>
        </TableDataCell>
      )
    case 'document_type':
      return (
        <TableDataCell className="text-sm font-medium text-slate-900">
          <span className="truncate leading-none">
            {complianceDocumentTypeLabel(doc.document_type)}
          </span>
        </TableDataCell>
      )
    case 'valid_until':
      return (
        <TableDataCell className="text-sm text-slate-600">
          <span className="leading-none">
            {formatComplianceValidUntilDate(doc.valid_until)}
          </span>
        </TableDataCell>
      )
    case 'status':
      return (
        <TableDataCell>
          {expired ? (
            <Badge variant="outline" className="text-[10px] font-medium text-amber-800">
              Abgelaufen
            </Badge>
          ) : doc.is_current ? (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Aktuelle Version
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
              Archiv
            </Badge>
          )}
        </TableDataCell>
      )
    case 'updated_at':
      return (
        <TableDataCell
          className="text-right text-sm text-muted-foreground"
          alignClassName="justify-end"
        >
          <span className="leading-none">{formatReferenceDate(doc.updated_at, 'de-DE')}</span>
        </TableDataCell>
      )
    default:
      return null
  }
}

export function renderComplianceActionsCell(
  doc: ComplianceDocumentRow,
  ctx: ComplianceTableCellRenderContext
): React.ReactNode {
  return (
    <TableCell className="w-[88px] min-w-[88px] align-middle p-2 text-right">
      <TableRowAlign className="justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg hover:bg-muted/70"
          disabled={!doc.file_storage_path || ctx.resolvingId === doc.id}
          data-compliance-skip-row-click
          onClick={() => ctx.onDownload(doc)}
          aria-label={`${doc.title} herunterladen`}
        >
          {ctx.resolvingId === doc.id ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4 text-muted-foreground" aria-hidden />
          )}
        </Button>
      </TableRowAlign>
    </TableCell>
  )
}

export function getComplianceSortValue(
  doc: ComplianceDocumentRow,
  key: ComplianceColumnKey
): string | number {
  switch (key) {
    case 'document_type':
      return complianceDocumentTypeLabel(doc.document_type).toLowerCase()
    case 'title':
      return doc.title.toLowerCase()
    case 'valid_until':
      return doc.valid_until ? new Date(doc.valid_until).getTime() : 0
    case 'status':
      if (isComplianceDocumentExpired(doc.valid_until)) return 2
      if (doc.is_current) return 0
      return 1
    case 'updated_at':
      return new Date(doc.updated_at).getTime()
    default:
      return ''
  }
}

export function loadComplianceColumnOrderFromStorage(): ComplianceColumnKey[] {
  if (typeof window === 'undefined') return [...COMPLIANCE_COLUMN_KEYS]
  try {
    const raw = localStorage.getItem('compliance-documents-column-order-v2')
    if (!raw) return [...COMPLIANCE_COLUMN_KEYS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...COMPLIANCE_COLUMN_KEYS]
    const allowed = new Set<string>(COMPLIANCE_COLUMN_KEYS)
    const seen = new Set<string>()
    const result: ComplianceColumnKey[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && allowed.has(item) && !seen.has(item)) {
        seen.add(item)
        result.push(item as ComplianceColumnKey)
      }
    }
    for (const k of COMPLIANCE_COLUMN_KEYS) {
      if (!seen.has(k)) result.push(k)
    }
    return result
  } catch {
    return [...COMPLIANCE_COLUMN_KEYS]
  }
}
