"use client"

/* eslint-disable react-hooks/incompatible-library */

import * as React from "react"
import {
  flexRender,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { SlidersHorizontal } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { COPY } from "@/lib/copy"
import { AppIcon } from "@/lib/icons"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DataTable<TData, TValue>({
  columns,
  data,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  paginationLabel,
  onSelectedRowIdsChange,
  getRowId,
  toolbar,
  showViewOptions = false,
  emptyText = COPY.table.empty,
}: {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialPageSize?: number
  pageSizeOptions?: number[]
  paginationLabel?: (args: {
    pageIndex: number
    pageSize: number
    pageCount: number
    total: number
    showing: number
  }) => React.ReactNode
  onSelectedRowIdsChange?: (rowIds: string[]) => void
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
  toolbar?: React.ReactNode
  showViewOptions?: boolean
  emptyText?: React.ReactNode
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: initialPageSize },
    },
  })

  React.useEffect(() => {
    if (!onSelectedRowIdsChange) return
    const ids = table.getSelectedRowModel().rows.map((r) => r.id)
    onSelectedRowIdsChange(ids)
  }, [onSelectedRowIdsChange, table, rowSelection])

  const total = data.length
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const pageCount = table.getPageCount()
  const showing = table.getRowModel().rows.length

  return (
    <div className="space-y-3">
      {toolbar || showViewOptions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>{toolbar}</div>
          {showViewOptions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <AppIcon icon={SlidersHorizontal} size={16} />
                  {COPY.table.view}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>{COPY.table.columns}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((c) => c.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                    >
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
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
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />

      {paginationLabel ? (
        <div className="text-sm text-muted-foreground">
          {paginationLabel({ pageIndex, pageSize, pageCount, total, showing })}
        </div>
      ) : null}
    </div>
  )
}

