"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { StarIcon } from "@hugeicons/core-free-icons"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AppIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { ReferenceStatusBadge } from "@/components/reference-status-badge"

import {
  getReferenceAssets,
  toggleFavorite,
  type ReferenceAssetRow,
} from "@/app/dashboard/actions"
import type { Profile } from "@/app/dashboard/dashboard-shell"

import { PdfExportDialog } from "@/app/dashboard/evidence/[id]/pdf-export-dialog"
import { ShareLinkButton } from "@/app/dashboard/evidence/[id]/share-link-button"

import type { ConceptReferenceRow } from "./types"
import { splitTags } from "./types"
import { ReferenceDetailPane } from "./reference-detail-pane"

type SortKey = "created_at" | "title" | "company_name"
type StatusFilter = "all" | ConceptReferenceRow["status"]

function useSelectedId() {
  const params = useSearchParams()
  return params.get("id")
}

function buildUrl(pathname: string, searchParams: URLSearchParams, patch: Record<string, string | null>) {
  const next = new URLSearchParams(searchParams)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) next.delete(k)
    else next.set(k, v)
  }
  const qs = next.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function InboxRow({
  item,
  active,
  href,
}: {
  item: ConceptReferenceRow
  active: boolean
  href: string
}) {
  const tags = splitTags(item.tags)

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border px-3 py-2 transition-colors",
        "hover:bg-muted/50",
        active ? "bg-muted border-foreground/15" : "bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 shrink-0">
            {item.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.company_logo_url}
                alt=""
                className="h-9 w-9 rounded-md border object-contain bg-background"
              />
            ) : (
              <div className="h-9 w-9 rounded-md border bg-muted/40" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-medium">{item.title}</div>
              {item.status === "draft" ? (
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              ) : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.status === "anonymized" ? "Anonymisierter Kunde" : item.company_name}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <ReferenceStatusBadge status={item.status} customerApprovalStatus={item.customer_approval_status} />
        </div>
      </div>

      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {item.summary ?? item.customer_challenge ?? "—"}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="secondary" className="rounded-md">
            {t}
          </Badge>
        ))}
        {tags.length > 3 ? (
          <Badge variant="outline" className="rounded-md">
            +{tags.length - 3}
          </Badge>
        ) : null}
      </div>
    </Link>
  )
}

export function InboxReferencesConceptClient({
  references,
  profileRole,
  externalContacts,
}: {
  references: ConceptReferenceRow[]
  profileRole: Profile["role"]
  externalContacts: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = useSelectedId()

  const data = useMemo(() => references, [references])

  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])

  const columns = useMemo<ColumnDef<ConceptReferenceRow>[]>(
    () => [
      { id: "title", accessorKey: "title" },
      { id: "company_name", accessorKey: "company_name" },
      { id: "status", accessorKey: "status" },
      { id: "created_at", accessorKey: "created_at" },
      {
        id: "tags",
        accessorFn: (row) => splitTags(row.tags).join(" "),
      },
      {
        id: "text",
        accessorFn: (row) =>
          [row.summary, row.customer_challenge, row.our_solution].filter(Boolean).join(" "),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").trim().toLowerCase()
      if (!q) return true
      const v = [
        row.original.title,
        row.original.company_name,
        row.original.summary,
        row.original.customer_challenge,
        row.original.our_solution,
        row.original.tags,
        row.original.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return v.includes(q)
    },
  })

  const rows = table.getRowModel().rows
  const selected =
    selectedId ? data.find((d) => d.id === selectedId) ?? null : null

  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assets, setAssets] = useState<ReferenceAssetRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      if (!selected) {
        setAssets([])
        setAssetsLoading(false)
        setDetailLoading(false)
        return
      }
      setDetailLoading(true)
      setAssetsLoading(true)
      try {
        const a = await getReferenceAssets(selected.id)
        if (cancelled) return
        setAssets(a)
      } finally {
        if (!cancelled) {
          setAssetsLoading(false)
          setDetailLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selected?.id])

  // Wenn eine ungültige ID in der URL steht, räumen wir sie auf (und vermeiden „leeres Detail“).
  React.useEffect(() => {
    if (!selectedId) return
    if (data.length === 0) return
    if (selected) return
    router.replace(buildUrl(pathname, searchParams, { id: null }))
  }, [selectedId, selected, data.length, router, pathname, searchParams])

  // Default: wenn keine Auswahl in der URL steht, wähle das erste Element automatisch.
  React.useEffect(() => {
    if (selectedId) return
    if (data.length === 0) return
    const first = data[0]
    if (!first?.id) return
    router.replace(buildUrl(pathname, searchParams, { id: first.id }))
  }, [selectedId, data, router, pathname, searchParams])

  const statusValue =
    (table.getColumn("status")?.getFilterValue() as StatusFilter | undefined) ??
    "all"
  const sortKey = (sorting[0]?.id as SortKey | undefined) ?? "created_at"
  const sortDir = sorting[0]?.desc ? "desc" : "asc"

  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col gap-4 p-4">
      <ResizablePanelGroup orientation="horizontal" className="flex-1 rounded-lg border bg-background">
        <ResizablePanel defaultSize="42%" minSize={28}>
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Suchen…"
                  className="h-9 min-w-[220px] flex-1"
                />

                <Select
                  value={statusValue}
                  onValueChange={(v) => {
                    const col = table.getColumn("status")
                    if (!col) return
                    col.setFilterValue(v === "all" ? undefined : v)
                  }}
                >
                  <SelectTrigger className="h-9" aria-label="Status Filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="internal_only">internal_only</SelectItem>
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="anonymized">anonymized</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={`${sortKey}:${sortDir}`}
                  onValueChange={(v) => {
                    const [id, dir] = v.split(":") as [SortKey, "asc" | "desc"]
                    setSorting([{ id, desc: dir === "desc" }])
                  }}
                >
                  <SelectTrigger className="h-9" aria-label="Sortierung">
                    <SelectValue placeholder="Sortieren" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at:desc">Neueste zuerst</SelectItem>
                    <SelectItem value="created_at:asc">Älteste zuerst</SelectItem>
                    <SelectItem value="title:asc">Titel A→Z</SelectItem>
                    <SelectItem value="title:desc">Titel Z→A</SelectItem>
                    <SelectItem value="company_name:asc">Account A→Z</SelectItem>
                    <SelectItem value="company_name:desc">Account Z→A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div>{rows.length} Treffer</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setGlobalFilter("")
                    setColumnFilters([])
                    setSorting([{ id: "created_at", desc: true }])
                    router.push(buildUrl(pathname, searchParams, { id: null }))
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {rows.map((r) => {
                  const item = r.original
                  const href = buildUrl(pathname, searchParams, { id: item.id })
                  return (
                    <InboxRow
                      key={item.id}
                      item={item}
                      active={item.id === selectedId}
                      href={href}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="58%" minSize={38}>
          <div className="flex h-full flex-col">
            <div className="p-3">
              <div className="flex items-center justify-end gap-2">
                {selected ? (
                  <>
                    <form action={toggleFavorite.bind(null, selected.id)}>
                      <Button type="submit" variant="outline" size="sm" className="gap-2">
                        <AppIcon
                          icon={StarIcon}
                          size={16}
                          className={
                            selected.is_favorited
                              ? "text-amber-500 dark:text-amber-400"
                              : "text-muted-foreground opacity-80"
                          }
                        />
                        {selected.is_favorited ? "Favorit" : "Favorisieren"}
                      </Button>
                    </form>
                    <div className="hidden sm:block">
                      <PdfExportDialog referenceId={selected.id} />
                    </div>
                    <div className="hidden sm:block">
                      <ShareLinkButton referenceId={selected.id} />
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Wähle links eine Referenz aus.</div>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex-1 min-h-0">
              <ReferenceDetailPane
                selectedRef={selected}
                profileRole={profileRole}
                externalContacts={externalContacts}
                assets={assets}
                assetsLoading={assetsLoading}
                detailLoading={detailLoading}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

