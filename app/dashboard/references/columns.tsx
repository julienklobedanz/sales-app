"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ReferenceRow } from "@/app/dashboard/actions"
import { AppIcon } from "@/lib/icons"
import { ReferenceStatusBadge } from "@/components/reference-status-badge"
import { ROUTES } from "@/lib/routes"
import { AccountCell } from "@/components/table/account-cell"
import { TableRowCheckbox } from "@/components/table/table-row-checkbox"

export function referenceColumns(): ColumnDef<ReferenceRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <TableRowCheckbox
          rowHeight={10}
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
          aria-label="Alle auswählen"
        />
      ),
      cell: ({ row }) => (
        <TableRowCheckbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          aria-label="Zeile auswählen"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <span className="ml-2">
            <AppIcon icon={ArrowUpDown} size={16} />
          </span>
        </Button>
      ),
      cell: ({ row }) => (
        <ReferenceStatusBadge
          status={row.original.status}
          customerApprovalStatus={row.original.customer_approval_status}
          approvalScopeNamedMention={row.original.approval_scope_named_mention}
          approvalScopeAnonymousMention={row.original.approval_scope_anonymous_mention}
        />
      ),
    },
    {
      accessorKey: "company_name",
      minSize: 240,
      size: 280,
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Account
          <span className="ml-2">
            <AppIcon icon={ArrowUpDown} size={16} />
          </span>
        </Button>
      ),
      cell: ({ row }) => (
        <AccountCell
          companyName={row.original.company_name}
          companyId={row.original.company_id}
          companyLogoUrl={row.original.company_logo_url}
        />
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Titel
          <span className="ml-2">
            <AppIcon icon={ArrowUpDown} size={16} />
          </span>
        </Button>
      ),
      cell: ({ row }) => (
        <span className="block min-w-0 max-w-[420px] truncate text-sm font-semibold text-foreground">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const raw = row.original.tags ?? ""
        const tags = raw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 3)
        return (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {tags.length ? (
              tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const ref = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <AppIcon icon={MoreHorizontal} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(ref.id)}
              >
                ID kopieren
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={ROUTES.references.detail(ref.id)}>Öffnen</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.references.edit(ref.id)}>Bearbeiten</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

