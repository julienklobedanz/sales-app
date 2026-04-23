"use client"

import * as React from "react"

import { ReferenceStatusBadge } from "@/components/reference-status-badge"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateUtcDe, formatReferenceVolume } from "@/lib/format"

import type { ReferenceAssetRow } from "@/app/dashboard/actions"
import type { Profile } from "@/app/dashboard/dashboard-shell"

import type { ConceptReferenceRow } from "./types"
import { splitTags } from "./types"

export function ReferenceDetailPane({
  selectedRef,
  profileRole,
  externalContacts,
  assets,
  assetsLoading,
  detailLoading,
}: {
  selectedRef: ConceptReferenceRow | null
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
  assets: ReferenceAssetRow[]
  assetsLoading: boolean
  detailLoading: boolean
}) {
  if (!selectedRef) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="text-sm font-medium">Keine Auswahl</div>
        <div className="text-sm text-muted-foreground max-w-md">
          Wähle links eine Referenz aus. Rechts zeigen wir die Detail-Abschnitte im Split-Layout.
        </div>
      </div>
    )
  }

  if (detailLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <Skeleton className="mt-0.5 h-11 w-11 rounded-md" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-[320px] max-w-[60vw]" />
                <Skeleton className="h-4 w-[220px] max-w-[45vw]" />
              </div>
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <section className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border bg-background p-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-2 h-4 w-24" />
                  </div>
                ))}
              </div>
            </section>
            <Separator />
            <section className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </section>
            <Separator />
            <section className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </section>
            <Separator />
            <section className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </section>
          </div>
        </ScrollArea>
      </div>
    )
  }

  const tags = splitTags(selectedRef.tags)
  const ext = selectedRef.customer_contact_id
    ? externalContacts.find((c) => c.id === selectedRef.customer_contact_id)
    : undefined
  const customerDisplay =
    selectedRef.customer_contact ||
    (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(" ") : null) ||
    "—"

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 shrink-0">
              {selectedRef.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedRef.company_logo_url}
                  alt=""
                  className="h-11 w-11 rounded-md border object-contain bg-background"
                />
              ) : (
                <div className="h-11 w-11 rounded-md border bg-muted/40" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold leading-snug break-words">
                  {selectedRef.title}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedRef.status === "anonymized"
                  ? "Anonymisierter Kunde"
                  : selectedRef.company_name}{" "}
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-0.5">
            <ReferenceStatusBadge
              status={selectedRef.status}
              customerApprovalStatus={selectedRef.customer_approval_status}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.length ? (
            tags.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-md">
                {t}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <section className="space-y-2">
            <div className="text-sm font-semibold">Projektdetails</div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Volumen</div>
                <div className="mt-1 font-medium tabular-nums">
                  {selectedRef.volume_eur != null && selectedRef.volume_eur !== ""
                    ? formatReferenceVolume(selectedRef.volume_eur)
                    : "—"}
                </div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Vertragsart</div>
                <div className="mt-1 font-medium">{selectedRef.contract_type ?? "—"}</div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Projektstart</div>
                <div className="mt-1 font-medium">
                  {selectedRef.project_start ? formatDateUtcDe(selectedRef.project_start) : "—"}
                </div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Projektende</div>
                <div className="mt-1 font-medium">
                  {selectedRef.project_end ? formatDateUtcDe(selectedRef.project_end) : "—"}
                </div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Akt. Dienstleister</div>
                <div className="mt-1 font-medium">{selectedRef.incumbent_provider ?? "—"}</div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground">Wettbewerber</div>
                <div className="mt-1 font-medium">{selectedRef.competitors ?? "—"}</div>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Herausforderung</div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedRef.customer_challenge ?? "—"}
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold">Unsere Lösung</div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedRef.our_solution ?? "—"}
              </p>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm font-semibold">Kontakte</div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Interner Ansprechpartner</div>
                <div className="font-medium">
                  {selectedRef.contact_display || selectedRef.contact_email || "Nicht zugewiesen"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Kundenansprechpartner</div>
                <div className="font-medium">{customerDisplay}</div>
                {ext?.email ? <div className="text-xs text-muted-foreground">{ext.email}</div> : null}
                {ext?.role ? <div className="text-xs text-muted-foreground">{ext.role}</div> : null}
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="text-sm font-semibold">Dateien</div>
            {assetsLoading ? (
              <div className="rounded-lg border border-dashed p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 max-w-[60%]" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-56 max-w-[70%]" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ) : assets.length === 0 && !selectedRef.file_path ? (
              <div className="text-muted-foreground bg-muted/10 flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                <span>📎</span>
                <p>Keine Dateien vorhanden.</p>
              </div>
            ) : (
              <Tabs defaultValue="sales" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sales">Sales</TabsTrigger>
                  <TabsTrigger value="contract">Verträge</TabsTrigger>
                  <TabsTrigger value="other">Sonstiges</TabsTrigger>
                </TabsList>
                {(["sales", "contract", "other"] as const).map((cat) => {
                  const legacyFile =
                    cat === "other" && assets.length === 0 && selectedRef.file_path
                      ? {
                          path: selectedRef.file_path,
                          name: selectedRef.file_path.split("/").pop() ?? "Dokument",
                          isLegacy: true as const,
                        }
                      : null
                  const assetsInCat = assets.filter((a) => a.category === cat)
                  const hasLegacy = !!legacyFile
                  const hasItems = assetsInCat.length > 0 || hasLegacy
                  return (
                    <TabsContent key={cat} value={cat} className="mt-2">
                      {!hasItems ? (
                        <p className="text-muted-foreground py-4 text-center text-sm">
                          Keine Dateien in dieser Kategorie.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {legacyFile ? (
                            <li className="flex items-center justify-between gap-2 rounded-lg border p-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm">{legacyFile.name}</div>
                                <div className="text-[10px] text-muted-foreground">Legacy Datei</div>
                              </div>
                            </li>
                          ) : null}
                          {assetsInCat.map((asset) => (
                            <li
                              key={asset.id}
                              className="flex items-center justify-between gap-2 rounded-lg border p-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm">
                                  {asset.file_name || asset.file_path.split("/").pop() || "Dokument"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatDateUtcDe(asset.created_at)}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  )
                })}
              </Tabs>
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="text-sm font-semibold">Historie</div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Erstellt</span>
                <span className="font-medium">{formatDateUtcDe(selectedRef.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Letzte Änderung</span>
                <span className="font-medium">
                  {selectedRef.updated_at ? formatDateUtcDe(selectedRef.updated_at) : "—"}
                </span>
              </div>
              {profileRole === "admin" ? (
                <p className="text-xs text-muted-foreground">
                  (Admin-Ansicht: Aktionen sind oben in der Leiste minimal gehalten.)
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}

