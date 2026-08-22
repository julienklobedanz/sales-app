'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

import type {
  ReferenceColumnKey,
  ReferenceTableHeaderRenderContext,
} from './reference-table-column-types'

export type HeaderDragProps = {
  columnKey: ReferenceColumnKey
  dragOverColumn: string | null
  onDragOverColumn: (key: string | null) => void
  onColumnMove: (from: string, to: string) => void
  width: number
  onWidthChange: (key: string, width: number) => void
}

export function buildHeaderDragProps(
  column: ReferenceColumnKey,
  ctx: ReferenceTableHeaderRenderContext,
): HeaderDragProps {
  return {
    columnKey: column,
    dragOverColumn: ctx.dragOverColumn,
    onDragOverColumn: ctx.setDragOverColumn,
    onColumnMove: ctx.moveColumnOrder,
    width: ctx.columnWidths[column],
    onWidthChange: (key: string, width: number) =>
      ctx.onColumnWidthChange(key as ReferenceColumnKey, width),
  }
}

function ColumnSortIcon({
  column,
  sortKey,
  sortDir,
  activePrimary = false,
}: {
  column: ReferenceColumnKey
  sortKey: ReferenceColumnKey | null
  sortDir: 'asc' | 'desc'
  activePrimary?: boolean
}) {
  if (sortKey === column) {
    return sortDir === 'asc' ? (
      <AppIcon
        icon={ArrowUp}
        size={14}
        className={activePrimary ? 'text-primary' : undefined}
      />
    ) : (
      <AppIcon
        icon={ArrowDown}
        size={14}
        className={activePrimary ? 'text-primary' : undefined}
      />
    )
  }
  return <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
}

export function ColumnSortButton({
  column,
  sortKey,
  sortDir,
  handleSort,
  label,
  activePrimary = false,
  className = 'flex items-center gap-0.5 hover:opacity-80',
}: {
  column: ReferenceColumnKey
  sortKey: ReferenceColumnKey | null
  sortDir: 'asc' | 'desc'
  handleSort: (column: ReferenceColumnKey) => void
  label?: string
  activePrimary?: boolean
  className?: string
}) {
  return (
    <button type="button" className={className} onClick={() => handleSort(column)}>
      {label}
      <ColumnSortIcon
        column={column}
        sortKey={sortKey}
        sortDir={sortDir}
        activePrimary={activePrimary}
      />
    </button>
  )
}
