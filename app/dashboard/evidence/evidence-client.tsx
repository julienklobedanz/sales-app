"use client"

import * as React from "react"
import Link from "next/link"
import { CirclePlus, SlidersHorizontal } from "@hugeicons/core-free-icons"

import type { ReferenceRow } from "@/app/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { evidenceColumns } from "./columns"
import { EvidenceDataTable } from "./data-table"
import { AppIcon } from "@/lib/icons"
import { ToolbarSearchField } from "@/components/ui/toolbar-search-field"
import { COPY } from "@/lib/copy"
import { ROUTES } from "@/lib/routes"
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
                <Button asChild variant="outline">
                  <Link href={ROUTES.evidence.newBulk}>Bulk-Import</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {selectedIds.length ? (
            <div className="fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2">
              <div className="flex items-center justify-between rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <div className="text-sm text-muted-foreground">
                  {selectedIds.length} ausgewählt
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="toolbar">
                      Aktionen
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk-Aktionen</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>PDF exportieren</DropdownMenuItem>
                    <DropdownMenuItem disabled>Portfolio erstellen</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={isSales}>Anonymisieren</DropdownMenuItem>
                    <DropdownMenuItem disabled={isSales} className="text-destructive focus:text-destructive">
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}

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
                    <Button variant="outline" size="toolbar">
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
                      ...(isSales
                        ? []
                        : [
                            { key: "draft", label: "Entwurf" },
                            { key: "anonymized", label: "Anonymisiert" },
                          ]),
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

