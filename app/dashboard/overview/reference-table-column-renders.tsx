"use client"

import type * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TableCell } from "@/components/ui/table"
import { TableDataCell } from "@/components/table/table-row-align"
import { ReferenceStatusBadge } from "@/components/reference-status-badge"
import { AccountCell } from "@/components/table/account-cell"
import { FilterMenuCheckboxOption } from "@/components/table/filter-menu-checkbox-option"
import { DraggableColumnHead } from "@/components/table/draggable-column-head"
import { ROUTES } from "@/lib/routes"
import {
  formatReferenceDate,
  formatReferenceVolumeCompact,
  normalizeOrgDateDisplayFormat,
  type OrgDateDisplayFormat,
} from "@/lib/format"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
} from "@hugeicons/core-free-icons"
import { formatIndustryDisplay, getIndustryLabelDe } from "@/lib/constants/industries"
import { AppIcon } from "@/lib/icons"
import Link from "next/link"

import type { ReferenceRow } from "../actions"

/** Muss mit COLUMN_KEYS in dashboard-overview übereinstimmen */
export type ReferenceColumnKey =
  | "company"
  | "title"
  | "industry"
  | "volume_eur"
  | "status"
  | "project_status"
  | "updated_at"
  | "tags"
  | "country"
  | "project_start"
  | "project_end"
  | "duration_months"
  | "created_at"

export type ReferenceTableHeaderRenderContext = {
  dragOverColumn: string | null
  setDragOverColumn: (key: string | null) => void
  moveColumnOrder: (from: string, to: string) => void
  COLUMN_LABELS: Record<ReferenceColumnKey, string>
  STATUS_LABELS: Record<string, string>
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
  sortKey: ReferenceColumnKey | null
  sortDir: "asc" | "desc"
  handleSort: (column: ReferenceColumnKey) => void
}

export function renderReferenceColumnHeader(
  column: ReferenceColumnKey,
  ctx: ReferenceTableHeaderRenderContext
): React.ReactNode {
  const {
    dragOverColumn,
    setDragOverColumn,
    moveColumnOrder,
    COLUMN_LABELS,
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
    sortKey,
    sortDir,
    handleSort,
  } = ctx

  const dragProps = {
    columnKey: column,
    dragOverColumn,
    onDragOverColumn: setDragOverColumn,
    onColumnMove: moveColumnOrder,
  }

  switch (column) {
    case "company":
      return (
        <DraggableColumnHead {...dragProps} className="w-[180px]">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${companyFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.company}</span>
                {companyFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Input
                autoFocus
                placeholder="Unternehmen suchen…"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                {["all", ...filterOptions.companies]
                  .filter((value) => {
                    if (!companySearch.trim()) return true
                    const label = value === "all" ? "Alle" : value
                    return label
                      .toLowerCase()
                      .includes(companySearch.trim().toLowerCase())
                  })
                  .map((value) => {
                    const isAll = value === "all"
                    const label = isAll ? "Alle" : value
                    const selected = companyFilter === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCompanyFilter(value)
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                      >
                        <span className="truncate">{label}</span>
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                            selected ? "bg-primary border-primary" : "bg-muted"
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
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("company")}
          >
            {sortKey === "company" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} className="text-primary" />
              ) : (
                <AppIcon icon={ArrowDown} size={14} className="text-primary" />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "title":
      return (
        <DraggableColumnHead {...dragProps}>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("title")}
          >
            {COLUMN_LABELS.title}
            {sortKey === "title" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} className="text-primary" />
              ) : (
                <AppIcon icon={ArrowDown} size={14} className="text-primary" />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "volume_eur":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("volume_eur")}
          >
            {COLUMN_LABELS.volume_eur}
            {sortKey === "volume_eur" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} className="text-primary" />
              ) : (
                <AppIcon icon={ArrowDown} size={14} className="text-primary" />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "industry":
      return (
        <DraggableColumnHead {...dragProps}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${industryFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.industry}</span>
                {industryFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Input
                autoFocus
                placeholder="Industrie suchen…"
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                {["all", ...filterOptions.industries]
                  .filter((value) => {
                    if (!industrySearch.trim()) return true
                    const label = value === "all" ? "Alle" : getIndustryLabelDe(value)
                    return label
                      .toLowerCase()
                      .includes(industrySearch.trim().toLowerCase())
                  })
                  .map((value) => {
                    const isAll = value === "all"
                    const label = isAll ? "Alle" : getIndustryLabelDe(value)
                    const selected = industryFilter === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setIndustryFilter(value)
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                      >
                        <span className="truncate">{label}</span>
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                            selected ? "bg-primary border-primary" : "bg-muted"
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
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("industry")}
          >
            {sortKey === "industry" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "status":
      return (
        <DraggableColumnHead {...dragProps}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${statusFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.status}</span>
                {statusFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-1"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="max-h-56 space-y-0 overflow-y-auto text-sm">
                {["all", ...filterOptions.statuses].map((value) => {
                    const isAll = value === "all"
                    const label = isAll ? "Alle" : STATUS_LABELS[value] ?? value
                    const selected = statusFilter === value
                    return (
                      <FilterMenuCheckboxOption
                        key={value}
                        label={label}
                        selected={selected}
                        onSelect={() => setStatusFilter(value)}
                      />
                    )
                  })}
              </div>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("status")}
          >
            {sortKey === "status" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} className="text-primary" />
              ) : (
                <AppIcon icon={ArrowDown} size={14} className="text-primary" />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "project_status":
      return (
        <DraggableColumnHead {...dragProps}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${projectStatusFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.project_status}</span>
                {projectStatusFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Input
                autoFocus
                placeholder="Projektstatus suchen…"
                value={projectStatusSearch}
                onChange={(e) => setProjectStatusSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto p-0.5 text-sm">
                {["all", ...filterOptions.projectStatuses]
                  .filter((value) => {
                    if (!projectStatusSearch.trim()) return true
                    const label =
                      value === "all"
                        ? "Alle"
                        : value === "active"
                          ? "Aktiv"
                          : "Abgeschlossen"
                    return label
                      .toLowerCase()
                      .includes(projectStatusSearch.trim().toLowerCase())
                  })
                  .map((value) => {
                    const isAll = value === "all"
                    const label =
                      isAll
                        ? "Alle"
                        : value === "active"
                          ? "Aktiv"
                          : "Abgeschlossen"
                    const selected = projectStatusFilter === value
                    return (
                      <FilterMenuCheckboxOption
                        key={value}
                        label={label}
                        selected={selected}
                        onSelect={() => setProjectStatusFilter(value)}
                      />
                    )
                  })}
              </div>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("project_status")}
          >
            {sortKey === "project_status" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "updated_at":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("updated_at")}
          >
            {COLUMN_LABELS.updated_at}
            {sortKey === "updated_at" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "tags":
      return (
        <DraggableColumnHead {...dragProps} className="max-w-[120px]">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${tagsFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.tags}</span>
                {tagsFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Input
                autoFocus
                placeholder="Tags suchen…"
                value={tagsSearch}
                onChange={(e) => setTagsSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                {["all", ...filterOptions.tags]
                  .filter((value) => {
                    if (!tagsSearch.trim()) return true
                    const label = value === "all" ? "Alle" : value
                    return label
                      .toLowerCase()
                      .includes(tagsSearch.trim().toLowerCase())
                  })
                  .map((value) => {
                    const isAll = value === "all"
                    const label = isAll ? "Alle" : value
                    const selected = tagsFilter === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setTagsFilter(value)
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                      >
                        <span className="truncate">{label}</span>
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                            selected ? "bg-primary border-primary" : "bg-muted"
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
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("tags")}
          >
            {sortKey === "tags" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} className="text-primary" />
              ) : (
                <AppIcon icon={ArrowDown} size={14} className="text-primary" />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "country":
      return (
        <DraggableColumnHead {...dragProps}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-left hover:opacity-80 ${countryFilter !== "all" ? "font-semibold text-foreground" : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{COLUMN_LABELS.country}</span>
                {countryFilter !== "all" && (
                  <AppIcon
                    icon={Filter}
                    size={14}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Input
                autoFocus
                placeholder="HQ suchen…"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
                {["all", ...filterOptions.countries]
                  .filter((value) => {
                    if (!countrySearch.trim()) return true
                    const label = value === "all" ? "Alle" : value
                    return label
                      .toLowerCase()
                      .includes(countrySearch.trim().toLowerCase())
                  })
                  .map((value) => {
                    const isAll = value === "all"
                    const label = isAll ? "Alle" : value
                    const selected = countryFilter === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setCountryFilter(value)
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                      >
                        <span className="truncate">{label}</span>
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-input ${
                            selected ? "bg-primary border-primary" : "bg-muted"
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
            </PopoverContent>
          </Popover>
          <button
            type="button"
            className="flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("country")}
          >
            {sortKey === "country" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "project_start":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("project_start")}
          >
            {COLUMN_LABELS.project_start}
            {sortKey === "project_start" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "project_end":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("project_end")}
          >
            {COLUMN_LABELS.project_end}
            {sortKey === "project_end" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "duration_months":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("duration_months")}
          >
            {COLUMN_LABELS.duration_months}
            {sortKey === "duration_months" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    case "created_at":
      return (
        <DraggableColumnHead
          {...dragProps}
          className="text-right"
          contentAlign="end"
        >
          <button
            type="button"
            className="ml-auto flex items-center gap-0.5 hover:opacity-80"
            onClick={() => handleSort("created_at")}
          >
            {COLUMN_LABELS.created_at}
            {sortKey === "created_at" ? (
              sortDir === "asc" ? (
                <AppIcon icon={ArrowUp} size={14} />
              ) : (
                <AppIcon icon={ArrowDown} size={14} />
              )
            ) : (
              <AppIcon
                icon={ArrowUpDown}
                size={14}
                className="text-muted-foreground"
              />
            )}
          </button>
        </DraggableColumnHead>
      )
    default:
      return null
  }
}

export type ReferenceTableCellRenderContext = {
  PROJECT_STATUS_LABELS: Record<string, string>
  companyLogoById: Map<string, string>
  companyIndustryById: Map<string, string>
  orgDateDisplayFormat?: OrgDateDisplayFormat | string
}

export function renderReferenceColumnCell(
  column: ReferenceColumnKey,
  ref: ReferenceRow,
  ctx: ReferenceTableCellRenderContext
): React.ReactNode {
  const { PROJECT_STATUS_LABELS, companyLogoById, companyIndustryById } = ctx
  const dateFmt = normalizeOrgDateDisplayFormat(ctx.orgDateDisplayFormat)
  switch (column) {
    case "company":
      return (
        <TableDataCell>
          <Link
            href={ROUTES.accountsDetail(ref.company_id)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-w-0 max-w-full items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${ref.company_name} öffnen`}
          >
            <AccountCell
              companyName={ref.company_name}
              companyId={ref.company_id}
              companyLogoUrl={
                companyLogoById.get(ref.company_id) ?? ref.company_logo_url ?? null
              }
            />
          </Link>
        </TableDataCell>
      )
    case "title": {
      const summaryText = String(ref.summary ?? "").trim()
      return (
        <TableDataCell className="max-w-[min(100%,420px)] min-w-[140px]">
          <HoverCard openDelay={200} closeDelay={80}>
            <HoverCardTrigger asChild>
              <span
                className="block min-w-0 cursor-default truncate text-sm font-semibold leading-snug text-foreground decoration-foreground/30 underline-offset-2 hover:underline"
                title={ref.title}
              >
                {ref.title}
              </span>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              className="w-[min(100vw-2rem,380px)] max-h-[260px] overflow-y-auto"
            >
              <p className="mb-2 text-xs font-medium text-muted-foreground">Projekt-Zusammenfassung</p>
              {summaryText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{summaryText}</p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Noch keine Kurz-Zusammenfassung hinterlegt. Sie wird beim Anlegen der Referenz automatisch
                  ergänzt, sobald ausreichend Kontext vorliegt — oder kann in der Referenz bearbeitet werden.
                </p>
              )}
            </HoverCardContent>
          </HoverCard>
        </TableDataCell>
      )
    }
    case "industry": {
      const industryRaw =
        String(ref.industry ?? '').trim() ||
        companyIndustryById.get(ref.company_id) ||
        ''
      const industry = formatIndustryDisplay(industryRaw)
      return (
        <TableDataCell className="text-muted-foreground">
          <span className="truncate leading-none">{industry}</span>
        </TableDataCell>
      )
    }
    case "volume_eur":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm tabular-nums"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {formatReferenceVolumeCompact(ref.volume_eur) || ''}
          </span>
        </TableDataCell>
      )
    case "status":
      return (
        <TableDataCell>
          <ReferenceStatusBadge
            status={ref.status}
            customerApprovalStatus={ref.customer_approval_status}
          />
        </TableDataCell>
      )
    case "project_status":
      return (
        <TableDataCell className="text-sm text-muted-foreground">
          <span className="leading-none">
            {ref.project_status
              ? PROJECT_STATUS_LABELS[ref.project_status] ?? ref.project_status
              : ''}
          </span>
        </TableDataCell>
      )
    case "updated_at":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {ref.updated_at ? formatReferenceDate(ref.updated_at, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "tags":
      return (
        <TableDataCell className="max-w-[140px]">
          {ref.tags ? (
            <div className="flex flex-wrap gap-1">
              {ref.tags
                .split(/[\s,]+/)
                .map((t) => t.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          ) : null}
        </TableDataCell>
      )
    case "country":
      return (
        <TableDataCell className="text-muted-foreground">
          <span className="leading-none">{ref.country ?? ''}</span>
        </TableDataCell>
      )
    case "project_start":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {ref.project_start ? formatReferenceDate(ref.project_start, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "project_end":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {ref.project_end ? formatReferenceDate(ref.project_end, dateFmt) : ''}
          </span>
        </TableDataCell>
      )
    case "duration_months":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
        >
          <span className="leading-none">
            {ref.duration_months != null ? `${ref.duration_months}` : ''}
          </span>
        </TableDataCell>
      )
    case "created_at":
      return (
        <TableDataCell
          className="text-right text-muted-foreground text-sm"
          alignClassName="justify-end"
        >
          <span className="leading-none">{formatReferenceDate(ref.created_at, dateFmt)}</span>
        </TableDataCell>
      )
    default:
      return null
  }
}
