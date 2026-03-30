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
import { DataTable } from "@/components/ui/data-table"
import { evidenceColumns } from "./columns"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ViewMode = "table" | "cards"
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
  const [view, setView] = React.useState<ViewMode>("table")

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
          <div className="inline-flex rounded-md border p-1">
            <button
              type="button"
              className={[
                "h-9 px-3 rounded-md text-sm",
                view === "table" ? "bg-muted" : "hover:bg-muted/60",
              ].join(" ")}
              onClick={() => setView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={[
                "h-9 px-3 rounded-md text-sm",
                view === "cards" ? "bg-muted" : "hover:bg-muted/60",
              ].join(" ")}
              onClick={() => setView("cards")}
            >
              Cards
            </button>
          </div>

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
      ) : view === "table" ? (
        <DataTable
          columns={evidenceColumns()}
          data={filtered}
          getRowId={(row) => row.id}
          showViewOptions
          paginationLabel={({ pageIndex, pageSize, total }) => {
            const start = pageIndex * pageSize + 1
            const end = Math.min((pageIndex + 1) * pageSize, total)
            return `${start}–${end} von ${total} Referenzen`
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground truncate">{r.company_name}</span>
                </div>
                <CardTitle className="text-base">
                  <Link href={`/dashboard/evidence/${r.id}`} className="hover:underline">
                    {r.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {r.industry ?? "—"}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(r.tags ?? "")
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

