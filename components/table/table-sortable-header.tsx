'use client'

import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Props<TData> = {
  label: string
  column: Column<TData, unknown>
  className?: string
}

/** Sortierbarer Spaltentitel — gleicher Stil wie Referenzen-Übersicht. */
export function TableSortableHeader<TData>({ label, column, className }: Props<TData>) {
  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      className={cn(
        'flex h-10 items-center gap-0.5 p-0 font-inherit leading-none hover:opacity-80',
        className,
      )}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      {sorted === 'asc' ? (
        <AppIcon icon={ArrowUp} size={14} className="text-primary" />
      ) : sorted === 'desc' ? (
        <AppIcon icon={ArrowDown} size={14} className="text-primary" />
      ) : (
        <AppIcon icon={ArrowUpDown} size={14} className="text-muted-foreground" />
      )}
    </button>
  )
}
