"use client"

import * as React from "react"
import Link from "next/link"
import { Download, Link2, Trash2 } from "lucide-react"
import { CirclePlus, SlidersHorizontal } from "@hugeicons/core-free-icons"

import type { ReferenceRow } from "@/app/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { evidenceColumns } from "./columns"
import { EvidenceDataTable } from "./data-table"
import { AppIcon } from "@/lib/icons"
import { TableBulkActionsBar } from "@/components/table/table-bulk-actions-bar"
import { ToolbarSearchField } from "@/components/ui/toolbar-search-field"
import { COPY } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
import { isReferenceVisibleToSales } from "@/lib/references/sales-reference-visibility"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type StatusFilter = "all" | "approved" | "internal_only" | "draft" | "anonymized"

function normalizeHaystack(r: ReferenceRow) {
  return [
    r.title,
    r.company_name,
    r.tags ?? "",
  ]
    .join(" ")
    .toLowerCase()
}

// Status Chips wurden zugunsten der shadcn-Tasks Toolbar (Facets) ersetzt.

export function EvidenceClient({
  references,
  role,
}: {
  references: ReferenceRow[]
  role: "admin" | "sales" | "account_manager"
}) {
  const isSales = role === "sales"
  const canCreate = role === "admin" || role === "account_manager"
  const hasAny = references.length > 0

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return references.filter((r) => {
      if (!isReferenceVisibleToSales(r.status) && isSales) return false
      if (status !== "all" && r.status !== status) return false
      if (!q) return true
      return normalizeHaystack(r).includes(q)
    })
  }, [references, query, status])

  const emptyText = query.trim() || status !== "all"
    ? "Keine Referenzen für deine Filter gefunden."
    : "Keine Referenzen vorhanden."

  return (
    <div className="space-y-6">
      {!hasAny ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Referenzen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Erstelle deine erste Referenz oder importiere mehrere Dokumente auf einmal.
            </p>
            <div className="flex flex-wrap gap-2">
              {canCreate ? (
                <Button asChild>
                  <Link href={ROUTES.evidence.new}>Referenz erstellen</Link>
                </Button>
              ) : null}
              {canCreate ? (
                <Button asChild variant="ghost" className="hover:bg-muted/70">
                  <Link href={ROUTES.evidence.newBulk}>Bulk-Import</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <TableBulkActionsBar
            selectedCount={selectedIds.length}
            onClearSelection={() => setSelectedIds([])}
            actions={[
              {
                id: "download",
                label: "Herunterladen",
                icon: Download,
                disabled: true,
                onClick: () => undefined,
              },
              {
                id: "portfolio",
                label: "Portfolio",
                icon: Link2,
                disabled: true,
                onClick: () => undefined,
              },
              {
                id: "delete",
                label: "Löschen",
                icon: Trash2,
                variant: "destructive",
                disabled: isSales,
                onClick: () => undefined,
              },
            ]}
          />

          <EvidenceDataTable
            columns={evidenceColumns()}
            data={filtered}
            emptyText={emptyText}
            getRowId={(row) => row.id}
            onSelectedRowIdsChange={setSelectedIds}
            toolbar={() => (
              <>
                <ToolbarSearchField
                  variant="list"
                  value={query}
                  onChange={setQuery}
                  placeholder={COPY.evidence.filterReferencesPlaceholder}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="toolbar" className="hover:bg-muted/70">
                      <AppIcon icon={SlidersHorizontal} size={16} />
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-56">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {([
                      { key: "all", label: "Alle" },
                      { key: "approved", label: "Freigegeben" },
                      { key: "internal_only", label: "Intern" },
                      { key: "anonymized", label: "Anonymisiert" },
                      ...(isSales
                        ? []
                        : [{ key: "draft", label: "Entwurf" }]),
                    ] as Array<{ key: StatusFilter; label: string }>).map((opt) => (
                      <DropdownMenuCheckboxItem
                        key={opt.key}
                        checked={status === opt.key}
                        onCheckedChange={() => setStatus(opt.key)}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            toolbarRight={() =>
              canCreate ? (
                <Button asChild size="toolbar">
                  <Link href={ROUTES.evidence.new} className="inline-flex items-center gap-2">
                    <AppIcon icon={CirclePlus} size={16} />
                    Referenz erstellen
                  </Link>
                </Button>
              ) : null
            }
          />
        </div>
      )}
    </div>
  )
}

