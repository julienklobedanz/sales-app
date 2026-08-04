'use client'

import type * as React from 'react'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ColumnHeaderDragHandle } from '@/components/table/column-header-drag-handle'
import { ColumnResizeHandle } from '@/components/table/column-resize-handle'
import { TABLE_COLUMN_HEAD_CLASS } from '@/components/table/table-column-head-styles'
import {
  clampColumnWidth,
  TABLE_COLUMN_MAX_WIDTH,
  TABLE_COLUMN_MIN_WIDTH,
} from '@/lib/table-column-sizing'

type DraggableColumnHeadProps = {
  columnKey: string
  dragOverColumn: string | null
  onDragOverColumn: (key: string | null) => void
  onColumnMove: (from: string, to: string) => void
  className?: string
  /** Rechtsbündig: Griff + Titel als Gruppe am rechten Rand (kein Leerraum dazwischen). */
  contentAlign?: 'start' | 'end'
  /** Aktuelle Spaltenbreite in px (Resize). */
  width?: number
  /** Callback bei Breitenänderung. */
  onWidthChange?: (columnKey: string, width: number) => void
  children: React.ReactNode
}

export function DraggableColumnHead({
  columnKey,
  dragOverColumn,
  onDragOverColumn,
  onColumnMove,
  className,
  contentAlign = 'start',
  width,
  onWidthChange,
  children,
}: DraggableColumnHeadProps) {
  const isDropTarget = dragOverColumn === columnKey
  const alignEnd = contentAlign === 'end'
  const canResize = typeof width === 'number' && Boolean(onWidthChange)

  function handleResizeStart(event: React.MouseEvent | React.TouchEvent) {
    if (!canResize || !onWidthChange) return
    event.preventDefault()
    event.stopPropagation()

    const startX = 'touches' in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
    const startWidth = width

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX =
        'touches' in moveEvent
          ? (moveEvent.touches[0]?.clientX ?? startX)
          : moveEvent.clientX
      onWidthChange(
        columnKey,
        clampColumnWidth(
          startWidth + (clientX - startX),
          TABLE_COLUMN_MIN_WIDTH,
          TABLE_COLUMN_MAX_WIDTH,
        ),
      )
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }

  return (
    <TableHead
      className={cn(
        TABLE_COLUMN_HEAD_CLASS,
        alignEnd && 'text-right',
        className,
        isDropTarget && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
      )}
      style={
        typeof width === 'number'
          ? { width, minWidth: width, maxWidth: width }
          : undefined
      }
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        onDragOverColumn(columnKey)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onDragOverColumn(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const from = e.dataTransfer.getData('text/plain')
        onDragOverColumn(null)
        if (from && from !== columnKey) {
          onColumnMove(from, columnKey)
        }
      }}
    >
      <div
        className={cn(
          'flex w-full min-w-0 items-center gap-1',
          alignEnd && 'justify-end',
        )}
      >
        <ColumnHeaderDragHandle
          columnKey={columnKey}
          onDragEnd={() => onDragOverColumn(null)}
        />
        <div className="flex min-w-0 items-center gap-1">{children}</div>
      </div>
      {canResize ? <ColumnResizeHandle onMouseDown={handleResizeStart} /> : null}
    </TableHead>
  )
}
