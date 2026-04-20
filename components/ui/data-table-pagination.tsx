'use client'

import { type Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY, copyTableRowsSelected } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 25, 30, 40, 50],
}: {
  table: Table<TData>
  pageSizeOptions?: number[]
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        {copyTableRowsSelected(
          table.getFilteredSelectedRowModel().rows.length,
          table.getFilteredRowModel().rows.length,
        )}
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">{COPY.table.rowsPerPage}</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[84px] rounded-lg border-border/70 bg-background">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[126px] items-center justify-center text-sm font-medium text-muted-foreground">
          Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur ersten Seite"
          >
            <AppIcon icon={ChevronsLeft} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-muted/70"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Zur vorherigen Seite"
          >
            <AppIcon icon={ChevronLeft} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-muted/70"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Zur nächsten Seite"
          >
            <AppIcon icon={ChevronRight} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Zur letzten Seite"
          >
            <AppIcon icon={ChevronsRight} size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
