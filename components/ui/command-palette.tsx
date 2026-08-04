"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Handshake,
  Sparkles,
  Plus,
} from "@hugeicons/core-free-icons"

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { CompanyLogo } from "@/components/ui/company-logo"
import { CommandCenterSearchResults } from "@/components/dashboard/command-center-search-results"
import { createClient } from "@/lib/supabase/client"
import { COPY } from "@/lib/copy"
import { consumeCommandPalettePendingQuery, useCommandPalette } from "@/hooks/useCommandPalette"
import {
  emptyCommandSearchGroups,
  formatReferenceListLabel,
  hasAnyCommandSearchHit,
  hrefForGlobalSearchResult,
  searchCommandCenter,
  sanitizeIlikeUserInput,
  type CommandSearchGroups,
  type CommandSearchResult,
  type GlobalSearchResult,
} from "@/lib/command-center/global-search"
import { hrefForCommandSearchResult } from "@/lib/command-center/search-navigation"
import { pushCommandRecent } from "@/lib/command-center/push-recent"
import {
  COMMAND_RECENTS_KEY,
  loadCommandRecents,
  type CommandRecentItem,
} from "@/lib/command-center/recents"
import { useRole } from "@/hooks/useRole"
import { AppIcon } from "@/lib/icons"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

type RecentItem = CommandRecentItem

type DealHit = { kind: "deal"; id: string; title: string }

function matchesSearch(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (!n) return true
  return haystack.toLowerCase().includes(n)
}

function RecentRowIcon({ item }: { item: RecentItem }) {
  if (item.kind === "account") {
    return (
      <CompanyLogo
        src={item.logoUrl}
        companyId={item.id}
        fallbackText={item.title}
        containerClassName="size-5 shrink-0 rounded-md"
        fallbackIconSize={12}
      />
    )
  }
  if (item.kind === "deal") {
    return <AppIcon icon={Handshake} size={16} />
  }
  return <AppIcon icon={FileText} size={16} />
}

function pushRecentFromSearch(item: CommandSearchResult | DealHit | RecentItem) {
  if (item.kind === "reference") {
    pushCommandRecent({
      kind: "reference",
      id: item.id,
      title: item.title,
      accountName: "accountName" in item ? item.accountName : undefined,
    })
    return
  }
  if (item.kind === "account" || item.kind === "partner") {
    pushCommandRecent({
      kind: "account",
      id: item.id,
      title: item.title,
      logoUrl: "logoUrl" in item ? item.logoUrl ?? null : null,
    })
    return
  }
  if (item.kind === "deal") {
    pushCommandRecent({
      kind: "deal",
      id: item.id,
      title: item.title,
    })
  }
}

export function CommandPalette() {
  const router = useRouter()
  const { open, setOpen } = useCommandPalette()
  const { isAdmin, isAccountManager } = useRole()
  const [mounted, setMounted] = React.useState(false)

  const supabase = React.useMemo(() => createClient(), [])
  const supabaseRef = React.useRef(supabase)

  React.useEffect(() => {
    supabaseRef.current = supabase
  }, [supabase])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [groups, setGroups] = React.useState<CommandSearchGroups>(() => emptyCommandSearchGroups())
  const [dealHits, setDealHits] = React.useState<DealHit[]>([])
  const [recents, setRecents] = React.useState<RecentItem[]>([])
  /** Transition erst nach dem Öffnen — sonst animiert padding von 0 → Mitte (Box fällt nach unten). */
  const [glideReady, setGlideReady] = React.useState(false)

  // Load + hydrate recents when palette opens. Deps must stay fixed-length ([open] only).
  React.useEffect(() => {
    if (!open) return

    const current = loadCommandRecents()
    setRecents(current)

    const missingIds = current
      .filter((r) => r.kind === "account" && r.logoUrl === undefined)
      .map((r) => r.id)
    if (missingIds.length === 0) return

    let cancelled = false
    const client = supabaseRef.current
    void (async () => {
      const { data } = await client.from("companies").select("id, logo_url").in("id", missingIds)
      if (cancelled) return
      const byId = new Map(
        (data ?? []).map((row) => [String(row.id), (row.logo_url as string | null) ?? null] as const)
      )
      setRecents((prev) => {
        const next = prev.map((r) => {
          if (r.kind !== "account" || r.logoUrl !== undefined) return r
          return { ...r, logoUrl: byId.get(r.id) ?? null }
        })
        try {
          localStorage.setItem(COMMAND_RECENTS_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setGroups(emptyCommandSearchGroups())
      setDealHits([])
      setLoading(false)
      setGlideReady(false)
      return
    }
    const pending = consumeCommandPalettePendingQuery()
    if (pending) setQuery(pending)
    // Zwei Frames warten: Dialog ist erst gemountet, dann Transition einschalten.
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setGlideReady(true))
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) {
      setGroups(emptyCommandSearchGroups())
      setDealHits([])
      setLoading(false)
      return
    }

    let cancelled = false
    const client = supabaseRef.current
    const handle = window.setTimeout(async () => {
      setLoading(true)
      const safe = sanitizeIlikeUserInput(q)
      const [nextGroups, dealsRes] = await Promise.all([
        searchCommandCenter(client, q),
        safe
          ? client.from("deals").select("id,title").ilike("title", `%${safe}%`).limit(8)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      ])
      if (cancelled) return
      setGroups(nextGroups)
      setDealHits(
        (dealsRes.data ?? []).map((d) => ({
          kind: "deal" as const,
          id: String(d.id),
          title: String(d.title ?? ""),
        }))
      )
      setLoading(false)
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, open])

  const canCreate = isAdmin || isAccountManager

  const quickActions = React.useMemo(() => {
    const base: Array<{
      key: string
      label: string
      icon: React.ReactNode
      onSelect: () => void
      visible: boolean
    }> = [
      {
        key: "new-reference",
        label: COPY.commandPalette.actionNewReference,
        icon: <AppIcon icon={FileText} size={14} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.references.new)
        },
        visible: canCreate,
      },
      {
        key: "new-account",
        label: COPY.commandPalette.actionNewAccount,
        icon: <AppIcon icon={Plus} size={14} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.accountsCreate)
        },
        visible: canCreate,
      },
      {
        key: "match",
        label: COPY.commandPalette.actionStartMatch,
        icon: <AppIcon icon={Sparkles} size={14} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.match)
        },
        visible: true,
      },
    ]
    return base.filter((x) => x.visible)
  }, [canCreate, router, setOpen])

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

  const hasSearchQuery = query.trim().length > 0
  const hasGroupHits = hasSearchQuery && !loading && hasAnyCommandSearchHit(groups)
  const hasDealHits = hasSearchQuery && !loading && dealHits.length > 0
  const hasEntityHits = hasGroupHits || hasDealHits

  const showRecentsBlock = !hasSearchQuery || filteredRecents.length > 0

  const hasAnyVisible = showRecentsBlock || hasEntityHits
  const showEmptyState = hasSearchQuery && !loading && !hasAnyVisible

  function openRecent(item: RecentItem) {
    pushRecentFromSearch(item)
    setRecents(loadCommandRecents())
    setOpen(false)
    router.push(hrefForGlobalSearchResult(item))
  }

  function openSearchResult(item: CommandSearchResult) {
    pushRecentFromSearch(item)
    setRecents(loadCommandRecents())
    setOpen(false)
    router.push(hrefForCommandSearchResult(item))
  }

  function openDeal(item: DealHit) {
    pushRecentFromSearch(item)
    setRecents(loadCommandRecents())
    setOpen(false)
    router.push(hrefForGlobalSearchResult(item as GlobalSearchResult))
  }

  if (!mounted) return null

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={COPY.commandPalette.title}
      description={COPY.commandPalette.description}
      className={cn(
        // Fullscreen-Host: Card immer horizontal+vertikal zentriert.
        "!top-0 !left-0 !h-full !w-full !max-w-none !translate-x-0 !translate-y-0",
        "!rounded-none !border-0 !bg-transparent !p-0 !shadow-none",
        "!flex items-center justify-center overflow-hidden",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-100",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-100"
      )}
      overlayClassName="bg-slate-950/45 backdrop-blur-sm"
      commandClassName={cn(
        // Wichtig: nicht h-full — sonst füllt die Card den Fullscreen-Host end-to-end.
        "!h-auto w-full max-w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-[0_8px_30px_rgba(15,23,42,0.12)]",
        "**:data-[slot=command-input-wrapper]:h-16 [&_[cmdk-input]]:h-16 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5",
        // Vom Zentrum nach oben gleiten (erst nach Open, sonst kein Mount-Ruckler).
        glideReady
          ? "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          : "!transition-none",
        hasSearchQuery ? "-translate-y-[min(22vh,10rem)]" : "translate-y-0"
      )}
      commandProps={{
        shouldFilter: false,
        loop: true,
      }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={COPY.commandPalette.placeholder}
        wrapperClassName="h-16 gap-3 border-b px-4 pr-12"
        iconSize={20}
        className="text-base sm:text-lg"
      />

      {/* Chips komplett einklappen (kein leerer weißer Streifen) */}
      {quickActions.length > 0 ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            hasSearchQuery ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                "flex flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-2.5 transition-opacity duration-150",
                hasSearchQuery ? "opacity-0" : "opacity-100"
              )}
            >
              {quickActions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={a.onSelect}
                  tabIndex={hasSearchQuery ? -1 : 0}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 text-xs font-medium text-foreground",
                    "transition-colors hover:bg-muted/70"
                  )}
                >
                  {a.icon}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Nur max-h — Box bleibt kompakt, scrollt bei vielen Treffern */}
      <CommandList
        className={cn(
          hasSearchQuery ? "max-h-[min(420px,55vh)]" : "max-h-[min(280px,40vh)]"
        )}
      >
        {loading && hasSearchQuery ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{COPY.commandPalette.searchLoading}</div>
        ) : null}

        {showEmptyState ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{COPY.commandPalette.searchEmpty}</div>
        ) : null}

        {showRecentsBlock ? (
          <CommandGroup heading={COPY.commandPalette.recents}>
            {!hasSearchQuery && recents.length === 0 ? (
              <CommandItem disabled value="recent-empty">
                <span>{COPY.commandPalette.noRecentsYet}</span>
              </CommandItem>
            ) : (
              (hasSearchQuery ? filteredRecents : recents).map((r) => (
                <CommandItem
                  key={`${r.kind}:${r.id}`}
                  value={`recent:${r.kind}:${r.id}:${r.title}`}
                  onSelect={() => openRecent(r)}
                >
                  <RecentRowIcon item={r} />
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

        {showRecentsBlock && hasEntityHits ? <CommandSeparator /> : null}

        {hasGroupHits ? (
          <CommandCenterSearchResults
            query={query}
            loading={false}
            groups={groups}
            onSelect={openSearchResult}
            embedded
          />
        ) : null}

        {hasDealHits ? (
          <CommandGroup heading={COPY.nav.deals}>
            {dealHits.map((r) => (
              <CommandItem
                key={`deal:${r.id}`}
                value={`deal:${r.id}:${r.title}`}
                onSelect={() => openDeal(r)}
              >
                <AppIcon icon={Handshake} size={16} />
                <span>{r.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
