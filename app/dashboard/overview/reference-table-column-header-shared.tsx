'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from '@hugeicons/core-free-icons'
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

export function ColumnSortIcon({
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

export const FilterColumnTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    label: string
    active: boolean
  }
>(function FilterColumnTrigger({ label, active }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`flex items-center gap-1 text-left hover:opacity-80 ${active ? 'font-semibold text-foreground' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{label}</span>
      {active && (
        <AppIcon icon={Filter} size={14} className="shrink-0 text-primary" aria-hidden />
      )}
    </button>
  )
})

export function SearchableRadioFilterMenu({
  search,
  setSearch,
  searchPlaceholder,
  options,
  filterValue,
  setFilter,
  getLabel,
  listClassName = 'mt-2 max-h-56 space-y-1 overflow-y-auto text-sm',
}: {
  search: string
  setSearch: (v: string) => void
  searchPlaceholder: string
  options: string[]
  filterValue: string
  setFilter: (v: string) => void
  getLabel: (value: string) => string
  listClassName?: string
}) {
  return (
    <>
      <Input
        autoFocus
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs"
      />
      <div className={listClassName}>
        {['all', ...options]
          .filter((value) => {
            if (!search.trim()) return true
            const label = value === 'all' ? 'Alle' : getLabel(value)
            return label.toLowerCase().includes(search.trim().toLowerCase())
          })
          .map((value) => {
            const isAll = value === 'all'
            const label = isAll ? 'Alle' : getLabel(value)
            const selected = filterValue === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
              >
                <span className="truncate">{label}</span>
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                    selected ? 'bg-primary border-primary' : 'bg-muted'
                  }`}
                >
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            )
          })}
      </div>
    </>
  )
}
