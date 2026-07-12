"use client"

import { type Table } from "@tanstack/react-table"
import { Settings2 } from "@hugeicons/core-free-icons"

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

function columnViewLabel<TData>(column: { id: string; columnDef: { header?: unknown; meta?: unknown } }): string {
  const meta = column.columnDef.meta as { viewLabel?: string } | undefined
  if (meta?.viewLabel) return meta.viewLabel
  if (typeof column.columnDef.header === "string") return column.columnDef.header
  return column.id.replace(/_/g, " ")
}

export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="toolbar" className="hover:bg-muted/70">
          <AppIcon icon={Settings2} size={16} />
          {COPY.table.columns}
        </Button>
      </DropdownMenuTrigger>
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
