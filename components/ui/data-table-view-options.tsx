"use client"

import { type Table } from "@tanstack/react-table"
import { Filter } from "@hugeicons/core-free-icons"

import { AccountsToolbarTooltip } from "@/app/dashboard/accounts/components/accounts-toolbar-tooltip"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COPY } from "@/lib/copy"
import { AppIcon } from "@/lib/icons"

function columnViewLabel(column: {
  id: string
  columnDef: { header?: unknown; meta?: unknown }
}): string {
  const meta = column.columnDef.meta as { viewLabel?: string } | undefined
  if (meta?.viewLabel) return meta.viewLabel
  if (typeof column.columnDef.header === "string") return column.columnDef.header
  return column.id.replace(/_/g, " ")
}

export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <AccountsToolbarTooltip label={COPY.dashboard.tooltipColumns}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="toolbar"
            className="shrink-0 px-2.5 hover:bg-muted/70"
            aria-label={COPY.dashboard.columnsToggleAria}
          >
            <AppIcon icon={Filter} size={16} className="shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
      </AccountsToolbarTooltip>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,13rem)]">
        <DropdownMenuLabel>{COPY.table.columns}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {columnViewLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
