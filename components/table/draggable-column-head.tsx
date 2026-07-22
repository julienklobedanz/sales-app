"use client"

import type * as React from "react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ColumnHeaderDragHandle } from "@/components/table/column-header-drag-handle"
import { TABLE_COLUMN_HEAD_CLASS } from "@/components/table/table-column-head-styles"

type DraggableColumnHeadProps = {
  columnKey: string
  dragOverColumn: string | null
  onDragOverColumn: (key: string | null) => void
  onColumnMove: (from: string, to: string) => void
  className?: string
  /** Rechtsbündig: Griff + Titel als Gruppe am rechten Rand (kein Leerraum dazwischen). */
  contentAlign?: "start" | "end"
  children: React.ReactNode
}

export function DraggableColumnHead({
  columnKey,
  dragOverColumn,
  onDragOverColumn,
  onColumnMove,
  className,
  contentAlign = "start",
  children,
}: DraggableColumnHeadProps) {
  const isDropTarget = dragOverColumn === columnKey
  const alignEnd = contentAlign === "end"

  return (
    <TableHead
      className={cn(
        TABLE_COLUMN_HEAD_CLASS,
        alignEnd && "text-right",
        className,
        isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary/40"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = "move"
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
        const from = e.dataTransfer.getData("text/plain")
        onDragOverColumn(null)
        if (from && from !== columnKey) {
          onColumnMove(from, columnKey)
        }
      }}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-1",
          alignEnd && "justify-end"
        )}
      >
        <ColumnHeaderDragHandle
          columnKey={columnKey}
          onDragEnd={() => onDragOverColumn(null)}
        />
        <div className="flex min-w-0 items-center gap-1">{children}</div>
      </div>
    </TableHead>
  )
}
