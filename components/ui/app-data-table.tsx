'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  type ColumnOrderState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
  type RowSelectionState,
  useReactTable,
} from '@tanstack/react-table'

import { ColumnHeaderDragHandle } from '@/components/table/column-header-drag-handle'
import { ColumnResizeHandle } from '@/components/table/column-resize-handle'
import {
  TABLE_COLUMN_HEAD_CLASS,
  TABLE_COLUMN_HEAD_SELECT_CLASS,
  TABLE_SELECT_COLUMN_CELL_CLASS,
} from '@/components/table/table-column-head-styles'
import { TABLE_COLUMN_MAX_WIDTH, TABLE_COLUMN_MIN_WIDTH } from '@/lib/table-column-sizing'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DataTablePagination, COLLECTION_PAGE_SIZE_OPTIONS } from '@/components/ui/data-table-pagination'
import { DataTableViewOptions } from '@/components/ui/data-table-view-options'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { referencesReadHref } from '@/lib/references/references-list-view'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

export type AppDataTableVariant = 'default' | 'references' | 'deals'

/** Klick auf interaktive Controls — keine Zeilen-Navigation (Checkbox, Links, Buttons, …). */
function isRowNavSuppressedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      "a[href], button, input, textarea, select, label, [role='checkbox'], [role='menuitem'], [data-slot='checkbox'], [data-row-nav-ignore]",
    ),
  )
}

export type AppDataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Standard: keine Zeilen-Aktion; `evidence` / `deals`: Kontextmenü (Routen jeweils Referenz- bzw. Deal-Detail). */
  tableVariant?: AppDataTableVariant
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode
  toolbarRight?: (table: TanstackTable<TData>) => React.ReactNode
  /** Spalten ein-/ausblenden (rechts neben der Toolbar). */
  showViewOptions?: boolean
  enableRowSelection?: boolean
  initialSorting?: SortingState
  onResetColumns?: () => void
  emptyText?: React.ReactNode
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
  onSelectedRowIdsChange?: (rowIds: string[]) => void
  initialPageSize?: number
  pageSizeOptions?: number[]
  /** Initiale Sichtbarkeit einzelner Spalten (z. B. Standard: ausgeblendet). */
  initialColumnVisibility?: VisibilityState
  /** Initiale Spalten-Reihenfolge (TanStack column ids). */
  initialColumnOrder?: string[]
  /** Optional kontrollierte Spalten-Reihenfolge. */
  columnOrder?: string[]
  /** Callback bei Reihenfolge-Änderung (z. B. Persistenz in localStorage). */
  onColumnOrderChange?: (order: string[]) => void
  /** Aktiviert Header Drag&Drop für Spalten-Reordering. */
  enableColumnDrag?: boolean
  /** Aktiviert Spalten-Resize am rechten Header-Rand. */
  enableColumnResize?: boolean
  /** Initiale / kontrollierte Spaltenbreiten (TanStack column ids → px). */
  columnSizing?: ColumnSizingState
  /** Callback bei Breiten-Änderung (Persistenz). */
  onColumnSizingChange?: (sizing: ColumnSizingState) => void
  /** Kontrollierte Spaltensichtbarkeit. */
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  /** Zeilenklick navigiert zu dieser URL (z. B. Sammlung mit Auswahl). */
  getRowHref?: (row: TData) => string | null
  /** Hebt die aktive Zeile in der Leseansicht hervor. */
  rowIsActive?: (row: TData) => boolean
}

export function AppDataTable<TData, TValue>({
  columns,
  data,
  tableVariant = 'default',
  toolbar,
  toolbarRight,
  showViewOptions = true,
  enableRowSelection = true,
  initialSorting,
  onResetColumns,
  emptyText = COPY.table.empty,
  getRowId,
  onSelectedRowIdsChange,
  initialPageSize = 10,
  pageSizeOptions = [...COLLECTION_PAGE_SIZE_OPTIONS],
  initialColumnVisibility,
  initialColumnOrder,
  columnOrder,
  onColumnOrderChange,
  enableColumnDrag = false,
  enableColumnResize = false,
  columnSizing,
  onColumnSizingChange,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange,
  getRowHref,
  rowIsActive,
}: AppDataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>(
    () => initialSorting ?? [],
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>(() => initialColumnVisibility ?? {})
  const resolvedColumnVisibility = controlledColumnVisibility ?? internalColumnVisibility
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [internalColumnOrder, setInternalColumnOrder] = React.useState<ColumnOrderState>(
    () => initialColumnOrder ?? [],
  )
  const [internalColumnSizing, setInternalColumnSizing] =
    React.useState<ColumnSizingState>(() => columnSizing ?? {})
  const [dragOverColumnId, setDragOverColumnId] = React.useState<string | null>(null)

  const resolvedColumnOrder = columnOrder ?? internalColumnOrder
  const resolvedColumnSizing = columnSizing ?? internalColumnSizing

  const table = useReactTable({
    data,
    columns,
    getRowId,
    enableRowSelection,
    enableColumnResizing: enableColumnResize,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: TABLE_COLUMN_MIN_WIDTH,
      maxSize: TABLE_COLUMN_MAX_WIDTH,
      size: 160,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ ...resolvedColumnVisibility })
          : updater
      setInternalColumnVisibility(next)
      onColumnVisibilityChange?.(next)
    },
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater([...resolvedColumnOrder]) : updater
      setInternalColumnOrder(next)
      onColumnOrderChange?.(next)
    },
    onColumnSizingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater({ ...resolvedColumnSizing }) : updater
      setInternalColumnSizing(next)
      onColumnSizingChange?.(next)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility: resolvedColumnVisibility,
      rowSelection,
      columnOrder: resolvedColumnOrder,
      columnSizing: resolvedColumnSizing,
    },
    initialState: {
      pagination: { pageSize: initialPageSize },
      columnVisibility: initialColumnVisibility ?? {},
      columnOrder: initialColumnOrder ?? [],
      columnSizing: columnSizing ?? {},
    },
  })

  const moveColumnOrder = React.useCallback(
    (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) return
      if (sourceId === 'select' || targetId === 'select') return
      table.setColumnOrder((prev) => {
        const base =
          prev.length > 0
            ? [...prev]
            : table.getAllLeafColumns().map((column) => column.id)
        const sourceIndex = base.indexOf(sourceId)
        const targetIndex = base.indexOf(targetId)
        if (sourceIndex === -1 || targetIndex === -1) return prev
        const next = [...base]
        const [moved] = next.splice(sourceIndex, 1)
        next.splice(targetIndex, 0, moved)
        return next
      })
    },
    [table],
  )

  React.useEffect(() => {
    if (!onSelectedRowIdsChange) return
    const ids = table.getSelectedRowModel().rows.map((r) => r.id)
    onSelectedRowIdsChange(ids)
  }, [onSelectedRowIdsChange, table, rowSelection])

  function renderBodyRow(row: Row<TData>) {
    const cells = row.getVisibleCells().map((cell) => (
      <TableCell
        key={cell.id}
        className={
          cell.column.id === 'select' ? TABLE_SELECT_COLUMN_CELL_CLASS : undefined
        }
        style={
          enableColumnResize
            ? { width: cell.column.getSize(), minWidth: cell.column.getSize() }
            : undefined
        }
      >
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </TableCell>
    ))

    const href = getRowHref?.(row.original) ?? null
    const isNavVariant = tableVariant === 'references' || tableVariant === 'deals' || Boolean(href)
    const rowNavClass = isNavVariant
      ? cn(
          'cursor-pointer hover:bg-accent/35',
          rowIsActive?.(row.original) && 'bg-muted',
        )
      : undefined

    const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
      if (!isNavVariant) return
      if (isRowNavSuppressedTarget(e.target)) return
      const targetHref =
        href ??
        (() => {
          const rawId = (row.original as { id?: string }).id
          if (!rawId) return null
          return tableVariant === 'references'
            ? referencesReadHref(rawId)
            : tableVariant === 'deals'
              ? ROUTES.deals.detail(rawId)
              : null
        })()
      if (!targetHref) return
      if (e.metaKey || e.ctrlKey) {
        window.open(targetHref, '_blank', 'noopener,noreferrer')
        return
      }
      if (e.button !== 0) return
      router.push(targetHref)
    }

    if (tableVariant === 'references') {
      return (
        <ContextMenu key={row.id}>
          <ContextMenuTrigger asChild>
            <TableRow
              data-state={row.getIsSelected() ? 'selected' : undefined}
              className={rowNavClass}
              onClick={handleRowClick}
            >
              {cells}
            </TableRow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => row.toggleSelected(true)}>
              {COPY.references.contextSelect}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = referencesReadHref(anyRow.id)
                }
              }}
            >
              {COPY.references.contextOpen}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = ROUTES.references.edit(anyRow.id)
                }
              }}
            >
              {COPY.references.contextEdit}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    }

    if (tableVariant === 'deals') {
      return (
        <ContextMenu key={row.id}>
          <ContextMenuTrigger asChild>
            <TableRow
              data-state={row.getIsSelected() ? 'selected' : undefined}
              className={rowNavClass}
              onClick={handleRowClick}
            >
              {cells}
            </TableRow>
          </ContextMenuTrigger>
            <ContextMenuContent>
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = ROUTES.deals.detail(anyRow.id)
                }
              }}
            >
              {COPY.deals.contextOpen}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.open(
                    ROUTES.deals.detail(anyRow.id),
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              }}
            >
              {COPY.deals.contextOpenNewTab}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    }

    return (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() ? 'selected' : undefined}
        className={rowNavClass}
        onClick={href ? handleRowClick : undefined}
      >
        {cells}
      </TableRow>
    )
  }

  return (
    <div className="space-y-3.5">
      <div className="flex w-full min-w-0 flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex w-full min-w-0 flex-1 items-center">
          {toolbar ? toolbar(table) : null}
        </div>
        {showViewOptions || toolbarRight ? (
          <div className="flex shrink-0 items-center gap-2.5">
            {showViewOptions ? (
              <DataTableViewOptions table={table} onReset={onResetColumns} />
            ) : null}
            {toolbarRight ? toolbarRight(table) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <Table
          className={enableColumnResize ? 'w-full table-fixed' : undefined}
          style={
            enableColumnResize
              ? { minWidth: Math.max(table.getTotalSize(), 640) }
              : undefined
          }
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id
                  const canDragColumn = enableColumnDrag && columnId !== 'select'
                  const canResizeColumn =
                    enableColumnResize &&
                    header.column.getCanResize() &&
                    columnId !== 'select'
                  const headerAlign = (
                    header.column.columnDef.meta as
                      | { headerAlign?: 'center' | 'end' }
                      | undefined
                  )?.headerAlign
                  const isDropTarget = dragOverColumnId === columnId

                  const isSelectColumn = columnId === 'select'

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                      }}
                      className={cn(
                        isSelectColumn
                          ? TABLE_COLUMN_HEAD_SELECT_CLASS
                          : TABLE_COLUMN_HEAD_CLASS,
                        headerAlign === 'end' && 'text-right',
                        isDropTarget &&
                          canDragColumn &&
                          'bg-primary/10 ring-1 ring-inset ring-primary/40',
                      )}
                      onDragOver={(event) => {
                        if (!canDragColumn) return
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'move'
                        setDragOverColumnId(columnId)
                      }}
                      onDragLeave={(event) => {
                        if (!canDragColumn) return
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setDragOverColumnId((prev) => (prev === columnId ? null : prev))
                        }
                      }}
                      onDrop={(event) => {
                        if (!canDragColumn) return
                        event.preventDefault()
                        event.stopPropagation()
                        const sourceId = event.dataTransfer.getData('text/plain')
                        moveColumnOrder(sourceId, columnId)
                        setDragOverColumnId(null)
                      }}
                    >
                      <div
                        className={cn(
                          'flex min-w-0 items-center gap-1',
                          headerAlign === 'center' && 'w-full justify-center',
                          headerAlign === 'end' && 'w-full justify-end',
                        )}
                      >
                        {canDragColumn ? (
                          <ColumnHeaderDragHandle
                            columnKey={columnId}
                            onDragEnd={() => setDragOverColumnId(null)}
                          />
                        ) : null}
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </div>
                      {canResizeColumn ? (
                        <ColumnResizeHandle
                          isResizing={header.column.getIsResizing()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        />
                      ) : null}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => renderBodyRow(row))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
    </div>
  )
}
