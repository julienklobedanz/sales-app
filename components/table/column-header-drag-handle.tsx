'use client'

import { DragDropHorizontalIcon } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'

type Props = {
  columnKey: string
  onDragEnd?: () => void
}

/** 6-Punkt-Griff zum Verschieben von Tabellenspalten. */
export function ColumnHeaderDragHandle({ columnKey, onDragEnd }: Props) {
  return (
    <button
      type="button"
      tabIndex={-1}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', columnKey)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={onDragEnd}
      onClick={(ev) => ev.stopPropagation()}
      className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none shrink-0"
      aria-label="Spalte verschieben"
    >
      <AppIcon icon={DragDropHorizontalIcon} size={14} />
    </button>
  )
}
