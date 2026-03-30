"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchIcon, SlidersHorizontal } from "lucide-react"

import type { ReferenceRow } from "@/app/dashboard/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { evidenceColumns } from "./columns"
import { EvidenceDataTable } from "./data-table"
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

function StatusBadge({ status }: { status: ReferenceRow["status"] }) {
  if (status === "approved") return <Badge className="bg-emerald-600">Freigegeben</Badge>
  if (status === "internal_only") return <Badge variant="secondary">Intern</Badge>
  if (status === "anonymized") return <Badge variant="outline">Anonymisiert</Badge>
  return <Badge variant="outline">Entwurf</Badge>
}

export function EvidenceClient({
  references,
  role,
}: {
  references: ReferenceRow[]
  role: "admin" | "sales" | "account_manager"
}) {
  const router = useRouter()
  const isSales = role === "sales"
  const canCreate = role === "admin" || role === "account_manager"

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

  return (
    <div className="px-6 pt-6 md:px-12 lg:px-20 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 w-full">
          <div className="relative w-full max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter references…"
              className="pl-9 h-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-4" />
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
        </div>

        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button asChild size="sm">
              <Link href="/dashboard/evidence/new">Add Reference</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {canCreate ? (
        <div
          className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (e.dataTransfer.files?.length) {
              router.push("/dashboard/evidence/new?bulk=true")
            }
          }}
        >
          <div className="text-sm font-medium">📄 Drag & Drop Import</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Dokument hierher ziehen für schnellen Import (E2: nutzt denselben Flow wie „Neue Referenz“).
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Referenzen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Lade dein erstes Dokument hoch — die KI extrahiert Titel, Branche und Zusammenfassung automatisch.
            </p>
            <div className="flex flex-wrap gap-2">
              {canCreate ? (
                <Button asChild>
                  <Link href="/dashboard/evidence/new">Referenz erstellen</Link>
                </Button>
              ) : null}
              {canCreate ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard/evidence/new?bulk=true">Bulk-Import</Link>
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
                    <Button variant="outline" size="sm" className="gap-2">
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
            getRowId={(row) => row.id}
            onSelectedRowIdsChange={setSelectedIds}
            toolbar={null}
          />
        </div>
      )}
    </div>
  )
}

