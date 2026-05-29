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
import { consumeCommandPalettePendingQuery, useCommandPalette } from "@/hooks/useCommandPalette"
import {
  formatReferenceListLabel,
  hrefForGlobalSearchResult,
  searchGlobalEntities,
  type GlobalSearchResult,
} from "@/lib/command-center/global-search"
import { pushCommandRecent } from "@/lib/command-center/push-recent"
import { loadCommandRecents, type CommandRecentItem } from "@/lib/command-center/recents"
import { useRole } from "@/hooks/useRole"
import { AppIcon } from "@/lib/icons"
import { ROUTES } from "@/lib/routes"

type RecentItem = CommandRecentItem

function matchesSearch(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase()
  if (!n) return true
  return haystack.toLowerCase().includes(n)
}

export function CommandPalette() {
  const router = useRouter()
  const { open, setOpen } = useCommandPalette()
  const { isAdmin, isAccountManager } = useRole()
  const [mounted, setMounted] = React.useState(false)

  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<GlobalSearchResult[]>([])
  const [recents, setRecents] = React.useState<RecentItem[]>([])

  React.useEffect(() => {
    setRecents(loadCommandRecents())
  }, [])

  const push = (item: GlobalSearchResult | RecentItem) => {
    pushCommandRecent({
      kind: item.kind,
      id: item.id,
      title: item.title,
      accountName: item.kind === "reference" ? item.accountName : undefined,
    })
    setRecents(loadCommandRecents())
    setOpen(false)
    router.push(hrefForGlobalSearchResult(item))
  }

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setLoading(false)
      return
    }
    const pending = consumeCommandPalettePendingQuery()
    if (pending) setQuery(pending)
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
      const next = await searchGlobalEntities(supabase, q)
      if (!cancelled) {
        setResults(next)
        setLoading(false)
      }
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
        visible: false,
      },
      {
        key: "deal-desk",
        label: "Deal Desk öffnen",
        searchKeywords: "rfp bid deal desk ausschreibung upload",
        icon: <AppIcon icon={Upload} size={16} />,
        onSelect: () => {
          setOpen(false)
          router.push(ROUTES.dealDesk)
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

  if (!mounted) return null

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
