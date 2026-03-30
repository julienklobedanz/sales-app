"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, FileTextIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ReferenceRow } from "@/app/dashboard/actions"

function StatusBadge({ status }: { status: ReferenceRow["status"] }) {
  if (status === "approved") return <Badge className="bg-emerald-600">Freigegeben</Badge>
  if (status === "internal_only") return <Badge variant="secondary">Intern</Badge>
  if (status === "anonymized") return <Badge variant="outline">Anonymisiert</Badge>
  return <Badge variant="outline">Entwurf</Badge>
}

export function evidenceColumns(): ColumnDef<ReferenceRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Alle auswählen"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Zeile auswählen"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
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
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "company_name",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Account
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate">{row.original.company_name}</div>
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
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/dashboard/evidence/${row.original.id}`}
          className="flex items-center gap-2 max-w-[420px] min-w-0 hover:underline"
        >
          <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="truncate">{row.original.title}</span>
        </Link>
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
  ]
}

