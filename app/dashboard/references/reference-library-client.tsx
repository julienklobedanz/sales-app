"use client"

import * as React from "react"
import Link from "next/link"
import { Download, Link2, Trash2 } from "lucide-react"
import { CirclePlus, SlidersHorizontal } from "@hugeicons/core-free-icons"

import type { ReferenceRow } from "@/app/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { referenceColumns } from "./columns"
import { ReferenceDataTable } from "./data-table"
import { AppIcon } from "@/lib/icons"
import { TableBulkActionsBar } from "@/components/table/table-bulk-actions-bar"
import { ToolbarSearchField } from "@/components/ui/toolbar-search-field"
import { COPY } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
import { isReferenceVisibleToSales } from "@/lib/references/sales-reference-visibility"
import type { Capability, FunctionRole, SystemRole } from "@/lib/roles/capabilities"
import {
  isSalesAppView,
  userCanCreateReference,
} from "@/lib/roles/reference-access"
import {
  matchesReferenceVolumeFilter,
  type ReferenceVolumeFilter,
} from "@/lib/references/reference-volume-filter"
import { ReferenceVolumeFilterMenu } from "@/components/references/reference-volume-filter-menu"
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

export function ReferenceLibraryClient({
  references,
  systemRole,
  functionRole,
  capabilities = {},
}: {
  references: ReferenceRow[]
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities?: Partial<Record<Capability, boolean>>
}) {
  const isSales = isSalesAppView(systemRole, functionRole)
  const canCreate = userCanCreateReference(functionRole, systemRole, capabilities)
  const hasAny = references.length > 0

  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [volumeFilter, setVolumeFilter] = React.useState<ReferenceVolumeFilter>("all")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return references.filter((r) => {
      if (!isReferenceVisibleToSales(r.status) && isSales) return false
      if (status !== "all" && r.status !== status) return false
      if (!matchesReferenceVolumeFilter(r.volume_eur, volumeFilter)) return false
      if (!q) return true
      return normalizeHaystack(r).includes(q)
    })
  }, [references, query, status, volumeFilter, isSales])

  const emptyText = query.trim() || status !== "all" || volumeFilter !== "all"
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
                  <Link href={ROUTES.references.new}>Referenz erstellen</Link>
                </Button>
              ) : null}
              {canCreate ? (
                <Button asChild variant="ghost" className="hover:bg-muted/70">
                  <Link href={ROUTES.references.newBulk}>Bulk-Import</Link>
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

          <ReferenceDataTable
            columns={referenceColumns()}
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
                  placeholder={COPY.references.filterReferencesPlaceholder}
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="toolbar"
                      className={volumeFilter !== 'all' ? 'bg-primary/10 text-primary hover:bg-primary/10' : 'hover:bg-muted/70'}
                    >
                      Volumen
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1">
                    <ReferenceVolumeFilterMenu value={volumeFilter} onChange={setVolumeFilter} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            toolbarRight={() =>
              canCreate ? (
                <Button asChild size="toolbar">
                  <Link href={ROUTES.references.new} className="inline-flex items-center gap-2">
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

