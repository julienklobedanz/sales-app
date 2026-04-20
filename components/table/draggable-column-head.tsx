"use client"

import type * as React from "react"
import { DragDropHorizontalIcon } from "@hugeicons/core-free-icons"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/lib/icons"

type DraggableColumnHeadProps = {
  columnKey: string
  dragOverColumn: string | null
  onDragOverColumn: (key: string | null) => void
  onColumnMove: (from: string, to: string) => void
  className?: string
  /** Ausrichtung des Spalteninhalts (Griff bleibt links) */
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

  return (
    <TableHead
      className={cn(
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
          "flex min-w-0 items-center gap-1",
          contentAlign === "end" && "justify-end"
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", columnKey)
            e.dataTransfer.effectAllowed = "move"
          }}
          onDragEnd={() => onDragOverColumn(null)}
          onClick={(ev) => ev.stopPropagation()}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none shrink-0"
          aria-label="Spalte verschieben"
        >
          <AppIcon icon={DragDropHorizontalIcon} size={14} />
        </button>
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1",
            contentAlign === "end" && "justify-end"
          )}
        >
          {children}
        </div>
      </div>
    </TableHead>
  )
}
