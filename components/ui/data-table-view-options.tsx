'use client'

import { type Table } from '@tanstack/react-table'

import { CollectionColumnsMenu } from '@/components/dashboard/collection-columns-menu'

function columnViewLabel(column: {
  id: string
  columnDef: { header?: unknown; meta?: unknown }
}): string {
  const meta = column.columnDef.meta as { viewLabel?: string } | undefined
  if (meta?.viewLabel) return meta.viewLabel
  if (typeof column.columnDef.header === 'string') return column.columnDef.header
  return column.id.replace(/_/g, ' ')
}

export function DataTableViewOptions<TData>({
  table,
  onReset,
}: {
  table: Table<TData>
  onReset?: () => void
}) {
  const columns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
    .map((column) => ({
      id: column.id,
      label: columnViewLabel(column),
      visible: column.getIsVisible(),
    }))

  return (
    <CollectionColumnsMenu
      columns={columns}
      onToggle={(id, visible) => table.getColumn(id)?.toggleVisibility(visible)}
      onReset={() => {
        if (onReset) {
          onReset()
          return
        }
        for (const column of table.getAllColumns()) {
          if (column.getCanHide()) column.toggleVisibility(true)
        }
      }}
    />
  )
}
