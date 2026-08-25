'use client'

import type * as React from 'react'

import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import { ComplianceDocumentTypeIcon } from '@/app/(app)/compliance/compliance-document-type-icon'
import { Badge } from '@/components/ui/badge'
import { TableDataCell } from '@/components/table/table-row-align'
import { DraggableColumnHead } from '@/components/table/draggable-column-head'
import type { ComplianceDocumentUsageById } from '@/lib/compliance/build-compliance-document-deal-usage'
import { complianceDocumentTypeLabel } from '@/lib/compliance/document-types'
import { COPY } from '@/lib/copy'
import { complianceValidityStatus } from '@/lib/compliance/expiry'
import { formatComplianceValidUntilDate } from '@/lib/compliance/format'
import { formatReferenceDate } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@hugeicons/core-free-icons'

const COMPLIANCE_COLUMN_KEYS = [
  'title',
  'document_type',
  'valid_until',
  'status',
  'used_in',
  'updated_at',
] as const

export type ComplianceColumnKey = (typeof COMPLIANCE_COLUMN_KEYS)[number]

const COMPLIANCE_COLUMN_LABELS: Record<ComplianceColumnKey, string> = {
  document_type: 'Typ',
  title: 'Titel',
  valid_until: 'Gültig bis',
  status: 'Status',
  used_in: COPY.compliance.usedInLabel,
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
  onOpenPdf: (doc: ComplianceDocumentRow) => void
  usageByDocumentId: ComplianceDocumentUsageById
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
  ctx: ComplianceTableHeaderRenderContext,
): React.ReactNode {
  const {
    dragOverColumn,
    setDragOverColumn,
    moveColumnOrder,
    sortKey,
    sortDir,
    handleSort,
  } = ctx

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
    case 'used_in':
      return (
        <DraggableColumnHead {...dragProps} contentAlign="end">
          <SortableHeaderButton
            column="used_in"
            label={COMPLIANCE_COLUMN_LABELS.used_in}
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
  ctx: ComplianceTableCellRenderContext,
): React.ReactNode {
  switch (column) {
    case 'title':
      return (
        <TableDataCell className="min-w-[180px] font-medium text-foreground">
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
        <TableDataCell className="text-sm font-medium text-foreground">
          <span className="truncate leading-none">
            {complianceDocumentTypeLabel(doc.document_type)}
          </span>
        </TableDataCell>
      )
    case 'valid_until':
      return (
        <TableDataCell className="text-sm text-muted-foreground">
          <span className="leading-none">
            {formatComplianceValidUntilDate(doc.valid_until)}
          </span>
        </TableDataCell>
      )
    case 'status': {
      const validity = complianceValidityStatus(doc.valid_until)
      const label =
        validity === 'expired'
          ? COPY.compliance.statusExpired
          : validity === 'expiring'
            ? COPY.compliance.statusExpiring
            : COPY.compliance.statusValid
      const className =
        validity === 'expired'
          ? 'text-[10px] font-medium text-amber-800'
          : validity === 'expiring'
            ? 'text-[10px] font-medium text-amber-800'
            : 'text-[10px] font-medium'
      return (
        <TableDataCell>
          <Badge
            variant={validity === 'valid' ? 'secondary' : 'outline'}
            className={className}
          >
            {label}
          </Badge>
        </TableDataCell>
      )
    }
    case 'used_in':
      return (
        <TableDataCell
          className="text-right text-sm tabular-nums text-muted-foreground"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {ctx.usageByDocumentId[doc.id]?.dealCount ?? 0}
          </span>
        </TableDataCell>
      )
    case 'updated_at':
      return (
        <TableDataCell
          className="text-right text-sm text-muted-foreground"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {formatReferenceDate(doc.updated_at, 'de-DE')}
          </span>
        </TableDataCell>
      )
    default:
      return null
  }
}

export function getComplianceSortValue(
  doc: ComplianceDocumentRow,
  key: ComplianceColumnKey,
  usageByDocumentId: ComplianceDocumentUsageById = {},
): string | number {
  switch (key) {
    case 'document_type':
      return complianceDocumentTypeLabel(doc.document_type).toLowerCase()
    case 'title':
      return doc.title.toLowerCase()
    case 'valid_until':
      return doc.valid_until ? new Date(doc.valid_until).getTime() : 0
    case 'status': {
      const validity = complianceValidityStatus(doc.valid_until)
      if (validity === 'expired') return 2
      if (validity === 'expiring') return 1
      return 0
    }
    case 'used_in':
      return usageByDocumentId[doc.id]?.dealCount ?? 0
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
