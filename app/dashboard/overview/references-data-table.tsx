'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import type { ReferenceRow } from '../actions'
import type { Profile } from '../dashboard-types'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CopyIcon,
  FileText,
  LinkIcon,
  MoreHorizontal,
  Pencil,
  StarIcon,
  Trash2,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import {
  renderReferenceColumnCell,
  renderReferenceColumnHeader,
  type ReferenceColumnKey,
} from './reference-table-column-renders'
import {
  COLUMN_LABELS,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
} from './reference-overview-columns'
import { TableRowCheckbox } from '@/components/table/table-row-checkbox'
import {
  TABLE_COLUMN_HEAD_SELECT_CLASS,
  TABLE_SELECT_COLUMN_CELL_CLASS,
} from '@/components/table/table-column-head-styles'
import { TableRowAlign } from '@/components/table/table-row-align'
import { copyTableRowsSelected } from '@/lib/copy'
import type { OrgDateDisplayFormat } from '@/lib/format'
import type { ReferenceVolumeFilter } from '@/lib/references/reference-volume-filter'

export type ReferencesDataTableProps = {
  filteredReferences: ReferenceRow[]
  paginatedReferences: ReferenceRow[]
  filteredSelectedCount: number
  selectedRefIds: Set<string>
  setSelectedRefIds: React.Dispatch<React.SetStateAction<Set<string>>>
  orderedVisibleColumnKeys: ReferenceColumnKey[]
  columnWidths: Record<ReferenceColumnKey, number>
  onColumnWidthChange: (column: ReferenceColumnKey, width: number) => void
  dragOverColumn: string | null
  setDragOverColumn: (key: string | null) => void
  moveColumnOrder: (from: string, to: string) => void
  filterOptions: {
    statuses: string[]
    industries: string[]
    countries: string[]
    projectStatuses: string[]
    companies: string[]
    tags: string[]
  }
  companyFilter: string
  setCompanyFilter: (v: string) => void
  companySearch: string
  setCompanySearch: (v: string) => void
  tagsFilter: string
  setTagsFilter: (v: string) => void
  tagsSearch: string
  setTagsSearch: (v: string) => void
  industryFilter: string
  setIndustryFilter: (v: string) => void
  industrySearch: string
  setIndustrySearch: (v: string) => void
  countryFilter: string
  setCountryFilter: (v: string) => void
  countrySearch: string
  setCountrySearch: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  projectStatusFilter: string
  setProjectStatusFilter: (v: string) => void
  projectStatusSearch: string
  setProjectStatusSearch: (v: string) => void
  volumeFilter: ReferenceVolumeFilter
  setVolumeFilter: (v: ReferenceVolumeFilter) => void
  sortKey: ReferenceColumnKey | null
  sortDir: 'asc' | 'desc'
  handleSort: (column: ReferenceColumnKey) => void
  companyLogoById: Map<string, string>
  companyIndustryById: Map<string, string>
  orgDateDisplayFormat: OrgDateDisplayFormat | string
  profile: Profile
  search: string
  setNewRefModalOpen: (open: boolean) => void
  rowMenuOpenId: string | null
  setRowMenuOpenId: (id: string | null) => void
  openDetail: (ref: ReferenceRow) => void
  toggleCart: (refId: string, e?: React.MouseEvent) => void
  handleToggleFavorite: (id: string, e?: React.MouseEvent) => void
  copyReferenceShareLink: (referenceId: string) => Promise<void>
  handleCopyId: (id: string, e: React.MouseEvent) => void
  handleDelete: (id: string, e?: React.MouseEvent) => void
  pageSize: number
  setPageSize: (size: number) => void
  pageIndex: number
  setPageIndex: React.Dispatch<React.SetStateAction<number>>
  pageCount: number
}

export function ReferencesDataTable({
  filteredReferences,
  paginatedReferences,
  filteredSelectedCount,
  selectedRefIds,
  setSelectedRefIds,
  orderedVisibleColumnKeys,
  columnWidths,
  onColumnWidthChange,
  dragOverColumn,
  setDragOverColumn,
  moveColumnOrder,
  filterOptions,
  companyFilter,
  setCompanyFilter,
  companySearch,
  setCompanySearch,
  tagsFilter,
  setTagsFilter,
  tagsSearch,
  setTagsSearch,
  industryFilter,
  setIndustryFilter,
  industrySearch,
  setIndustrySearch,
  countryFilter,
  setCountryFilter,
  countrySearch,
  setCountrySearch,
  statusFilter,
  setStatusFilter,
  projectStatusFilter,
  setProjectStatusFilter,
  projectStatusSearch,
  setProjectStatusSearch,
  volumeFilter,
  setVolumeFilter,
  sortKey,
  sortDir,
  handleSort,
  companyLogoById,
  companyIndustryById,
  orgDateDisplayFormat,
  profile,
  search,
  setNewRefModalOpen,
  rowMenuOpenId,
  setRowMenuOpenId,
  openDetail,
  toggleCart,
  handleToggleFavorite,
  copyReferenceShareLink,
  handleCopyId,
  handleDelete,
  pageSize,
  setPageSize,
  pageIndex,
  setPageIndex,
  pageCount,
}: ReferencesDataTableProps) {
  const router = useRouter()

  return (
    <>
      <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className={TABLE_COLUMN_HEAD_SELECT_CLASS}>
                <TableRowCheckbox
                  rowHeight={10}
                  checked={
                    filteredReferences.length > 0 &&
                    filteredReferences.every((r) => selectedRefIds.has(r.id))
                      ? true
                      : filteredSelectedCount > 0
                        ? 'indeterminate'
                        : false
                  }
                  onChange={() => {
                    if (filteredReferences.every((r) => selectedRefIds.has(r.id))) {
                      setSelectedRefIds(new Set())
                    } else {
                      setSelectedRefIds(new Set(filteredReferences.map((r) => r.id)))
                    }
                  }}
                  aria-label="Alle auswählen"
                  disabled={filteredReferences.length === 0}
                />
              </TableHead>
              {orderedVisibleColumnKeys.map((column) => (
                <React.Fragment key={column}>
                  {renderReferenceColumnHeader(column, {
                    dragOverColumn,
                    setDragOverColumn,
                    moveColumnOrder,
                    columnWidths,
                    onColumnWidthChange,
                    COLUMN_LABELS: COLUMN_LABELS as Record<ReferenceColumnKey, string>,
                    STATUS_LABELS,
                    filterOptions,
                    companyFilter,
                    setCompanyFilter,
                    companySearch,
                    setCompanySearch,
                    tagsFilter,
                    setTagsFilter,
                    tagsSearch,
                    setTagsSearch,
                    industryFilter,
                    setIndustryFilter,
                    industrySearch,
                    setIndustrySearch,
                    countryFilter,
                    setCountryFilter,
                    countrySearch,
                    setCountrySearch,
                    statusFilter,
                    setStatusFilter,
                    projectStatusFilter,
                    setProjectStatusFilter,
                    projectStatusSearch,
                    setProjectStatusSearch,
                    volumeFilter,
                    setVolumeFilter,
                    sortKey,
                    sortDir,
                    handleSort,
                  })}
                </React.Fragment>
              ))}
              <TableHead className="sticky right-0 z-10 w-[44px] min-w-[44px] bg-card p-2 text-right shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.12)] transition-colors hover:bg-accent/45">
                <span className="sr-only">Aktionen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReferences.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={orderedVisibleColumnKeys.length + 2}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-2">
                    <p>Keine Referenzen gefunden.</p>
                    {!search.trim() && isSystemAdmin(profile.systemRole) && (
                      <Button className="mt-1" onClick={() => setNewRefModalOpen(true)}>
                        Erstelle eine Referenz
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedReferences.map((ref) => (
                <TableRow
                  key={ref.id}
                  className="group cursor-pointer hover:bg-accent/35"
                  onClick={() => openDetail(ref)}
                  onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setRowMenuOpenId(ref.id)
                  }}
                >
                  <TableCell
                    className={TABLE_SELECT_COLUMN_CELL_CLASS}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableRowCheckbox
                      checked={selectedRefIds.has(ref.id)}
                      onChange={() => toggleCart(ref.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${ref.title} in Warenkorb`}
                    />
                  </TableCell>
                  {orderedVisibleColumnKeys.map((column) => (
                    <React.Fragment key={column}>
                      {renderReferenceColumnCell(column, ref, {
                        PROJECT_STATUS_LABELS,
                        companyLogoById,
                        companyIndustryById,
                        orgDateDisplayFormat,
                        columnWidths,
                      })}
                    </React.Fragment>
                  ))}
                  <TableCell
                    className="sticky right-0 z-10 w-[44px] min-w-[44px] bg-card align-middle p-2 text-right shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.12)] group-hover:bg-accent/35"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <TableRowAlign className="justify-end">
                      <DropdownMenu
                        open={rowMenuOpenId === ref.id}
                        onOpenChange={(open) => setRowMenuOpenId(open ? ref.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 shrink-0 p-0"
                            aria-label="Aktionen"
                          >
                            <AppIcon icon={MoreHorizontal} size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={(e) => {
                              void handleToggleFavorite(
                                ref.id,
                                e as unknown as React.MouseEvent
                              )
                            }}
                          >
                            <AppIcon
                              icon={StarIcon}
                              size={16}
                              className={`mr-2 ${ref.is_favorited ? 'text-amber-500' : ''}`}
                            />
                            {ref.is_favorited ? 'Favorit entfernen' : 'Als Favorit markieren'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              void copyReferenceShareLink(ref.id)
                            }}
                          >
                            <AppIcon icon={LinkIcon} size={16} className="mr-2" />
                            Kundenlink kopieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => openDetail(ref)}>
                            <AppIcon icon={FileText} size={16} className="mr-2" />
                            Details ansehen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => router.push(ROUTES.references.edit(ref.id))}
                          >
                            <AppIcon icon={Pencil} size={16} className="mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(e: Event) =>
                              handleCopyId(ref.id, e as unknown as React.MouseEvent)
                            }
                          >
                            <AppIcon icon={CopyIcon} size={16} className="mr-2" />
                            ID kopieren
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(e: Event) => {
                              handleDelete(ref.id, e as unknown as React.MouseEvent)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <AppIcon icon={Trash2} size={16} className="mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableRowAlign>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {copyTableRowsSelected(filteredSelectedCount, filteredReferences.length)}
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{COPY.table.rowsPerPage}</p>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPageIndex(0)
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-[88px] rounded-lg border-border/70 bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
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
              onClick={() => setPageIndex(0)}
              disabled={pageIndex <= 0}
              aria-label="Zur ersten Seite"
            >
              <AppIcon icon={ChevronsLeft} size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted/70"
              onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={pageIndex <= 0}
              aria-label="Zur vorherigen Seite"
            >
              <AppIcon icon={ChevronLeft} size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted/70"
              onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
              disabled={pageIndex >= pageCount - 1}
              aria-label="Zur nächsten Seite"
            >
              <AppIcon icon={ChevronRight} size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 rounded-lg hover:bg-muted/70 lg:flex"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
              aria-label="Zur letzten Seite"
            >
              <AppIcon icon={ChevronsRight} size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
