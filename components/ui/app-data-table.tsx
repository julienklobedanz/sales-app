"use client"

/* eslint-disable react-hooks/incompatible-library */

import * as React from "react"
import {
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
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { DataTableViewOptions } from "@/components/ui/data-table-view-options"
import { COPY } from "@/lib/copy"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export type AppDataTableVariant = "default" | "evidence" | "deals"

export type AppDataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Standard: keine Zeilen-Aktion; `evidence` / `deals`: Kontextmenü (Routen jeweils Referenz- bzw. Deal-Detail). */
  tableVariant?: AppDataTableVariant
  toolbar?: (table: TanstackTable<TData>) => React.ReactNode
  toolbarRight?: (table: TanstackTable<TData>) => React.ReactNode
  /** Spalten ein-/ausblenden (rechts neben der Toolbar). */
  showViewOptions?: boolean
  emptyText?: React.ReactNode
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
  onSelectedRowIdsChange?: (rowIds: string[]) => void
  initialPageSize?: number
  pageSizeOptions?: number[]
}

export function AppDataTable<TData, TValue>({
  columns,
  data,
  tableVariant = "default",
  toolbar,
  toolbarRight,
  showViewOptions = true,
  emptyText = COPY.table.empty,
  getRowId,
  onSelectedRowIdsChange,
  initialPageSize = 10,
  pageSizeOptions,
}: AppDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getRowId,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: initialPageSize },
    },
  })

  React.useEffect(() => {
    if (!onSelectedRowIdsChange) return
    const ids = table.getSelectedRowModel().rows.map((r) => r.id)
    onSelectedRowIdsChange(ids)
  }, [onSelectedRowIdsChange, table, rowSelection])

  function renderBodyRow(row: Row<TData>) {
    const cells = row.getVisibleCells().map((cell) => (
      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
    ))

    if (tableVariant === "evidence") {
      return (
        <ContextMenu key={row.id}>
          <ContextMenuTrigger asChild>
            <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>{cells}</TableRow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => row.toggleSelected(true)}>
              {COPY.evidence.contextSelect}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = `/dashboard/evidence/${anyRow.id}`
                }
              }}
            >
              {COPY.evidence.contextOpen}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = `/dashboard/evidence/${anyRow.id}/edit`
                }
              }}
            >
              {COPY.evidence.contextEdit}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    }

    if (tableVariant === "deals") {
      return (
        <ContextMenu key={row.id}>
          <ContextMenuTrigger asChild>
            <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>{cells}</TableRow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => row.toggleSelected(true)}>
              {COPY.deals.contextSelect}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.location.href = `/dashboard/deals/${anyRow.id}`
                }
              }}
            >
              {COPY.deals.contextOpen}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                const anyRow = row.original as unknown as { id?: string }
                if (anyRow?.id) {
                  window.open(`/dashboard/deals/${anyRow.id}`, "_blank", "noopener,noreferrer")
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
      <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
        {cells}
      </TableRow>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {toolbar ? toolbar(table) : null}
        </div>
        <div className="flex items-center gap-2">
          {showViewOptions ? <DataTableViewOptions table={table} /> : null}
          {toolbarRight ? toolbarRight(table) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => renderBodyRow(row))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
