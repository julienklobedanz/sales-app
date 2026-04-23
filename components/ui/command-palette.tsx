"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BrainCircuit,
  FileText,
  Handshake,
  Sparkles,
  Plus,
  Upload,
} from "@hugeicons/core-free-icons"

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { createClient } from "@/lib/supabase/client"
import { COPY } from "@/lib/copy"
import { useCommandPalette } from "@/hooks/useCommandPalette"
import { useRole } from "@/hooks/useRole"
import { AppIcon } from "@/lib/icons"
import { ROUTES } from "@/lib/routes"

type SearchResult =
  | { kind: "reference"; id: string; title: string; accountName: string | null }
  | { kind: "account"; id: string; title: string }
  | { kind: "deal"; id: string; title: string }

type RecentItem = SearchResult & { at: number }

const RECENTS_KEY = "refstack.recents.v1"
const MAX_RECENTS = 5

/** Zeichen, die LIKE/ilike in Postgres stören können */
function sanitizeIlikeUserInput(q: string): string {
  return q.trim().replace(/[%_\\]/g, "")
}

function buildIlikeOrFilter(columns: string[], raw: string): string | null {
  const safe = sanitizeIlikeUserInput(raw)
  if (!safe) return null
  const pat = `%${safe}%`
  return columns.map((col) => `${col}.ilike.${pat}`).join(",")
}

function matchesSearch(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (!n) return true
  return haystack.toLowerCase().includes(n)
}

function companyNameFromReferenceRow(row: { companies?: unknown }): string | null {
  const c = row.companies
  if (c == null) return null
  const obj = Array.isArray(c) ? c[0] : c
  if (!obj || typeof obj !== "object") return null
  const name = (obj as { name?: string | null }).name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

/** Anzeige in der Palette: mit Account nach „ — “, sonst Platzhalter in Klammern. */
function formatReferenceListLabel(title: string, accountName: string | null | undefined): string {
  const acc = accountName?.trim()
  if (acc) return `${title} — ${acc}`
  return `${title} (${COPY.commandPalette.referenceNoAccountLabel})`
}

function loadRecents(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[])
      .filter((x): x is RecentItem => {
        if (!x || typeof x !== "object") return false
        const r = x as Partial<RecentItem>
        if (typeof r.id !== "string" || typeof r.kind !== "string" || typeof r.title !== "string") {
          return false
        }
        if (r.kind === "reference") {
          const an = (r as { accountName?: unknown }).accountName
          return an === undefined || an === null || typeof an === "string"
        }
        return true
      })
      .map((x) => {
        const r = x as Partial<RecentItem> & { accountName?: string | null }
        if (r.kind === "reference") {
          return {
            ...x,
            accountName:
              typeof r.accountName === "string" ? r.accountName : null,
          } as RecentItem
        }
        return x as RecentItem
      })
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

function saveRecents(items: RecentItem[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)))
  } catch {
    // ignore
  }
}

function hrefFor(result: SearchResult) {
  if (result.kind === "account") return ROUTES.accountsDetail(result.id)
  if (result.kind === "deal") return ROUTES.deals.detail(result.id)
  return ROUTES.evidence.detail(result.id)
}

export function CommandPalette() {
  const router = useRouter()
  const { open, setOpen } = useCommandPalette()
  const { isAdmin, isAccountManager } = useRole()

  const supabase = React.useMemo(() => createClient(), [])

  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recents, setRecents] = React.useState<RecentItem[]>([])

  React.useEffect(() => {
    setRecents(loadRecents())
  }, [])

  const push = (item: SearchResult) => {
    setRecents((prev) => {
      const nextAt = (prev[0]?.at ?? 0) + 1
      const next: RecentItem[] = [
        { ...item, at: nextAt },
        ...prev.filter((x) => !(x.kind === item.kind && x.id === item.id)),
      ].slice(0, MAX_RECENTS)
      saveRecents(next)
      return next
    })
    setOpen(false)
    router.push(hrefFor(item))
  }

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setLoading(false)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const handle = window.setTimeout(async () => {
      setLoading(true)
      setResults([])

      const refOr = buildIlikeOrFilter(["title", "summary"], q)
      const dealOr = buildIlikeOrFilter(["title", "industry"], q)
      const companyPat = sanitizeIlikeUserInput(q)
      if (!companyPat) {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
        return
      }
      const likePat = `%${companyPat}%`

      const [refs, accounts, deals] = await Promise.all([
        refOr
          ? supabase.from("references").select("id,title,companies(name)").or(refOr).limit(8)
          : supabase
              .from("references")
              .select("id,title,companies(name)")
              .ilike("title", likePat)
              .limit(8),
        supabase.from("companies").select("id,name").ilike("name", likePat).limit(8),
        dealOr
          ? supabase.from("deals").select("id,title").or(dealOr).limit(8)
          : supabase.from("deals").select("id,title").ilike("title", likePat).limit(8),
      ])

      if (cancelled) return

      const next: SearchResult[] = []
      for (const r of (refs.data ?? []) as Array<{
        id: string
        title: string
        companies?: unknown
      }>) {
        next.push({
          kind: "reference",
          id: r.id,
          title: r.title,
          accountName: companyNameFromReferenceRow(r),
        })
      }
      for (const a of (accounts.data ?? []) as Array<{ id: string; name: string }>) {
        next.push({ kind: "account", id: a.id, title: a.name })
      }
      for (const d of (deals.data ?? []) as Array<{ id: string; title: string }>) {
        next.push({ kind: "deal", id: d.id, title: d.title })
      }

      setResults(next)
      setLoading(false)
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, open, supabase])

  const quickActions = React.useMemo(() => {
    const base: Array<{
      key: string
      label: string
      /** Zusätzliche Suchbegriffe (Deutsch/Englisch), durch Leerzeichen getrennt */
      searchKeywords: string
      icon: React.ReactNode
      onSelect: () => void
      visible: boolean
    }> = [
      {
        key: "match",
        label: COPY.commandPalette.actionStartMatch,
        searchKeywords: "match suche search semantisch rfp",
        icon: <AppIcon icon={Sparkles} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.match)
        },
        visible: true,
      },
      {
        key: "new-deal",
        label: COPY.commandPalette.actionNewDeal,
        searchKeywords: "deal neu anlegen pipeline",
        icon: <AppIcon icon={Handshake} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.deals.new)
        },
        visible: true,
      },
      {
        key: "rfp-upload",
        label: COPY.commandPalette.actionRfpUpload,
        searchKeywords: "rfp upload hochladen datei",
        icon: <AppIcon icon={Upload} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.deals.root)
        },
        visible: true,
      },
      {
        key: "new-reference",
        label: COPY.commandPalette.actionNewReference,
        searchKeywords: "referenz evidence neue referenz dokument",
        icon: <AppIcon icon={FileText} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.evidence.new)
        },
        visible: isAdmin || isAccountManager,
      },
      {
        key: "new-account",
        label: COPY.commandPalette.actionNewAccount,
        searchKeywords: "account firma kunde company neu",
        icon: <AppIcon icon={Plus} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.accountsCreate)
        },
        visible: isAdmin || isAccountManager,
      },
    ]
    return base.filter((x) => x.visible)
  }, [isAdmin, isAccountManager, router, setOpen])

  const filteredQuickActions = React.useMemo(() => {
    const q = query.trim()
    if (!q) return quickActions
    return quickActions.filter((a) => {
      const hay = `${a.label} ${a.searchKeywords}`
      return matchesSearch(hay, q)
    })
  }, [query, quickActions])

  const filteredRecents = React.useMemo(() => {
    const q = query.trim()
    if (!q) return recents
    return recents.filter((r) => {
      if (r.kind === "reference") {
        const label = formatReferenceListLabel(r.title, r.accountName ?? null)
        return matchesSearch(label, q) || matchesSearch(r.title, q)
      }
      return matchesSearch(r.title, q)
    })
  }, [query, recents])

  const grouped = React.useMemo(() => {
    const refs = results.filter((r) => r.kind === "reference")
    const accs = results.filter((r) => r.kind === "account")
    const deals = results.filter((r) => r.kind === "deal")
    return { refs, accs, deals }
  }, [results])

  const hasSearchQuery = query.trim().length > 0

  const hasEntityHits =
    hasSearchQuery &&
    !loading &&
    (grouped.refs.length > 0 || grouped.accs.length > 0 || grouped.deals.length > 0)

  const showRecentsBlock = !hasSearchQuery || filteredRecents.length > 0

  const showQuick = filteredQuickActions.length > 0

  const hasAnyVisible =
    showQuick ||
    showRecentsBlock ||
    hasEntityHits

  const showEmptyState = hasSearchQuery && !loading && !hasAnyVisible

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={COPY.commandPalette.title}
      description={COPY.commandPalette.description}
      className="max-w-[min(56rem,calc(100vw-2rem))] w-full rounded-2xl border border-border/80 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
      overlayClassName="bg-slate-950/45 backdrop-blur-sm"
      commandClassName="**:data-[slot=command-input-wrapper]:h-16 [&_[cmdk-input]]:h-16 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5"
      commandProps={{
        shouldFilter: false,
        loop: true,
      }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={COPY.commandPalette.placeholder}
        wrapperClassName="h-16 gap-3 border-b px-4"
        iconSize={20}
        className="text-base sm:text-lg"
      />
      <CommandList className="max-h-[min(420px,70vh)]">
        {loading && hasSearchQuery ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{COPY.commandPalette.searchLoading}</div>
        ) : null}

        {showEmptyState ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{COPY.commandPalette.searchEmpty}</div>
        ) : null}

        {showQuick ? (
          <CommandGroup heading={COPY.commandPalette.quickActions}>
            {filteredQuickActions.map((a) => (
              <CommandItem key={a.key} value={`qa:${a.key}`} onSelect={a.onSelect}>
                {a.icon}
                <span>{a.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {showQuick && showRecentsBlock ? <CommandSeparator /> : null}

        {showRecentsBlock ? (
          <CommandGroup heading={COPY.commandPalette.recents}>
            {!hasSearchQuery && recents.length === 0 ? (
              <CommandItem disabled value="recent-empty">
                <AppIcon icon={BrainCircuit} size={16} />
                <span>{COPY.commandPalette.noRecentsYet}</span>
              </CommandItem>
            ) : !hasSearchQuery ? (
              recents.map((r) => (
                <CommandItem
                  key={`${r.kind}:${r.id}`}
                  value={`recent:${r.kind}:${r.id}:${r.title}`}
                  onSelect={() => push(r)}
                >
                  {r.kind === "account" ? (
                    <AppIcon icon={BrainCircuit} size={16} />
                  ) : r.kind === "deal" ? (
                    <AppIcon icon={Handshake} size={16} />
                  ) : (
                    <AppIcon icon={FileText} size={16} />
                  )}
                  <span>
                    {r.kind === "reference"
                      ? formatReferenceListLabel(r.title, r.accountName ?? null)
                      : r.title}
                  </span>
                </CommandItem>
              ))
            ) : (
              filteredRecents.map((r) => (
                <CommandItem
                  key={`${r.kind}:${r.id}`}
                  value={`recent:${r.kind}:${r.id}:${r.title}`}
                  onSelect={() => push(r)}
                >
                  {r.kind === "account" ? (
                    <AppIcon icon={BrainCircuit} size={16} />
                  ) : r.kind === "deal" ? (
                    <AppIcon icon={Handshake} size={16} />
                  ) : (
                    <AppIcon icon={FileText} size={16} />
                  )}
                  <span>
                    {r.kind === "reference"
                      ? formatReferenceListLabel(r.title, r.accountName ?? null)
                      : r.title}
                  </span>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        ) : null}

        {(showQuick || showRecentsBlock) && hasEntityHits ? <CommandSeparator /> : null}

        {hasEntityHits ? (
          <>
            {grouped.refs.length ? (
              <CommandGroup heading={COPY.nav.evidence}>
                {grouped.refs.map((r) => (
                  <CommandItem
                    key={`ref:${r.id}`}
                    value={`ref:${r.id}:${formatReferenceListLabel(r.title, r.accountName)}`}
                    onSelect={() => push(r)}
                  >
                    <AppIcon icon={FileText} size={16} />
                    <span className="truncate">
                      {formatReferenceListLabel(r.title, r.accountName)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {grouped.accs.length ? (
              <CommandGroup heading={COPY.nav.accounts}>
                {grouped.accs.map((r) => (
                  <CommandItem
                    key={`acc:${r.id}`}
                    value={`acc:${r.id}:${r.title}`}
                    onSelect={() => push(r)}
                  >
                    <AppIcon icon={BrainCircuit} size={16} />
                    <span>{r.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {grouped.deals.length ? (
              <CommandGroup heading={COPY.nav.deals}>
                {grouped.deals.map((r) => (
                  <CommandItem
                    key={`deal:${r.id}`}
                    value={`deal:${r.id}:${r.title}`}
                    onSelect={() => push(r)}
                  >
                    <AppIcon icon={Handshake} size={16} />
                    <span>{r.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
