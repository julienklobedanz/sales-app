"use client"

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
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  getRowId?: (originalRow: TData, index: number, parent?: any) => string
  toolbar?: React.ReactNode
  showViewOptions?: boolean
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
                  <SlidersHorizontal className="size-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>Spalten</DropdownMenuLabel>
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
                Keine Ergebnisse.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} von{" "}
          {table.getFilteredRowModel().rows.length} Zeile(n) ausgewählt.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {Math.max(1, pageCount)}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
            >
              <ChevronFirst className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
            >
              <ChevronLast className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {paginationLabel ? (
        <div className="text-sm text-muted-foreground">
          {paginationLabel({ pageIndex, pageSize, pageCount, total, showing })}
        </div>
      ) : null}
    </div>
  )
}

