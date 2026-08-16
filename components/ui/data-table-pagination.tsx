'use client'

import { type Table } from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@hugeicons/core-free-icons'

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

export const COLLECTION_PAGE_SIZE_OPTIONS = [10, 30, 50] as const

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [...COLLECTION_PAGE_SIZE_OPTIONS],
}: {
  table: Table<TData>
  pageSizeOptions?: number[]
}) {
  return (
    <DataTablePaginationBar
      selectedCount={table.getFilteredSelectedRowModel().rows.length}
      totalCount={table.getFilteredRowModel().rows.length}
      pageIndex={table.getState().pagination.pageIndex}
      pageCount={Math.max(1, table.getPageCount())}
      pageSize={table.getState().pagination.pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageSizeChange={(size) => table.setPageSize(size)}
      onFirstPage={() => table.setPageIndex(0)}
      onPreviousPage={() => table.previousPage()}
      onNextPage={() => table.nextPage()}
      onLastPage={() => table.setPageIndex(table.getPageCount() - 1)}
      canPrevious={table.getCanPreviousPage()}
      canNext={table.getCanNextPage()}
    />
  )
}

export function DataTablePaginationBar({
  selectedCount,
  totalCount,
  pageIndex,
  pageCount,
  pageSize,
  pageSizeOptions = [...COLLECTION_PAGE_SIZE_OPTIONS],
  onPageSizeChange,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  canPrevious,
  canNext,
}: {
  selectedCount: number
  totalCount: number
  pageIndex: number
  pageCount: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageSizeChange: (size: number) => void
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  canPrevious: boolean
  canNext: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        {copyTableRowsSelected(selectedCount, totalCount)}
      </div>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {COPY.table.rowsPerPage}
          </p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[84px] rounded-lg border-border/70 bg-background"
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[126px] items-center justify-center text-sm font-medium text-muted-foreground">
          Seite {pageIndex + 1} von {pageCount}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
            onClick={onFirstPage}
            disabled={!canPrevious}
            aria-label="Zur ersten Seite"
          >
            <AppIcon icon={ChevronsLeft} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-muted/70"
            onClick={onPreviousPage}
            disabled={!canPrevious}
            aria-label="Zur vorherigen Seite"
          >
            <AppIcon icon={ChevronLeft} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-muted/70"
            onClick={onNextPage}
            disabled={!canNext}
            aria-label="Zur nächsten Seite"
          >
            <AppIcon icon={ChevronRight} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
            onClick={onLastPage}
            disabled={!canNext}
            aria-label="Zur letzten Seite"
          >
            <AppIcon icon={ChevronsRight} size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
