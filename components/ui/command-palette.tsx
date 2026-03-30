"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BrainCircuit,
  FileTextIcon,
  HandshakeIcon,
  Sparkles,
  Plus,
  TrendingUp,
  Upload,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { createClient } from "@/lib/supabase/client"
import { useCommandPalette } from "@/hooks/useCommandPalette"
import { useRole } from "@/hooks/useRole"

type SearchResult =
  | { kind: "reference"; id: string; title: string }
  | { kind: "account"; id: string; title: string }
  | { kind: "deal"; id: string; title: string }

type RecentItem = SearchResult & { at: number }

const RECENTS_KEY = "refstack.recents.v1"
const MAX_RECENTS = 5

function loadRecents(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === "object" && typeof (x as any).id === "string")
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
  if (result.kind === "account") return `/dashboard/accounts/${result.id}`
  if (result.kind === "deal") return `/dashboard/deals/${result.id}`
  return `/dashboard/evidence/${result.id}`
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
    const next: RecentItem[] = [
      { ...item, at: Date.now() },
      ...recents.filter((x) => !(x.kind === item.kind && x.id === item.id)),
    ].slice(0, MAX_RECENTS)
    setRecents(next)
    saveRecents(next)
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
      const like = `%${q}%`
      const [refs, accounts, deals] = await Promise.all([
        supabase.from("references").select("id,title").ilike("title", like).limit(6),
        supabase.from("companies").select("id,name").ilike("name", like).limit(6),
        supabase.from("deals").select("id,title").ilike("title", like).limit(6),
      ])

      if (cancelled) return

      const next: SearchResult[] = []
      for (const r of (refs.data ?? []) as Array<{ id: string; title: string }>) {
        next.push({ kind: "reference", id: r.id, title: r.title })
      }
      for (const a of (accounts.data ?? []) as Array<{ id: string; name: string }>) {
        next.push({ kind: "account", id: a.id, title: a.name })
      }
      for (const d of (deals.data ?? []) as Array<{ id: string; title: string }>) {
        next.push({ kind: "deal", id: d.id, title: d.title })
      }

      setResults(next)
      setLoading(false)
    }, 160)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, open, supabase])

  const quickActions = React.useMemo(() => {
    const base: Array<{
      key: string
      label: string
      icon: React.ReactNode
      onSelect: () => void
      visible: boolean
    }> = [
      {
        key: "match",
        label: "Match starten",
        icon: <Sparkles className="size-4" />,
        onSelect: () => {
          setOpen(false)
          router.push("/dashboard/match")
        },
        visible: true,
      },
      {
        key: "new-deal",
        label: "Neuen Deal erstellen",
        icon: <HandshakeIcon className="size-4" />,
        onSelect: () => {
          setOpen(false)
          router.push("/dashboard/deals/new")
        },
        visible: true,
      },
      {
        key: "rfp-upload",
        label: "RFP im Deal hochladen",
        icon: <Upload className="size-4" />,
        onSelect: () => {
          setOpen(false)
          router.push("/dashboard/deals")
        },
        visible: true,
      },
      {
        key: "new-reference",
        label: "Neue Referenz erstellen",
        icon: <FileTextIcon className="size-4" />,
        onSelect: () => {
          setOpen(false)
          router.push("/dashboard/evidence/new")
        },
        visible: isAdmin || isAccountManager,
      },
      {
        key: "new-account",
        label: "Account erstellen",
        icon: <Plus className="size-4" />,
        onSelect: () => {
          setOpen(false)
          router.push("/dashboard/accounts?create=1")
        },
        visible: isAdmin || isAccountManager,
      },
    ]
    return base.filter((x) => x.visible)
  }, [isAdmin, isAccountManager, router, setOpen])

  const grouped = React.useMemo(() => {
    const refs = results.filter((r) => r.kind === "reference")
    const accs = results.filter((r) => r.kind === "account")
    const deals = results.filter((r) => r.kind === "deal")
    return { refs, accs, deals }
  }, [results])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Suche nach Referenzen, Accounts oder Deals"
      className="max-w-2xl"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Suche nach Referenzen, Deals, Accounts…"
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Suche läuft…" : "Keine Ergebnisse gefunden."}
        </CommandEmpty>

        <CommandGroup heading="Schnellaktionen">
          {quickActions.map((a) => (
            <CommandItem key={a.key} onSelect={a.onSelect}>
              {a.icon}
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Zuletzt besucht">
          {recents.length === 0 ? (
            <CommandItem disabled>
              <BrainCircuit className="size-4" />
              <span>Noch keine Einträge</span>
            </CommandItem>
          ) : (
            recents.map((r) => (
              <CommandItem key={`${r.kind}:${r.id}`} onSelect={() => push(r)}>
                {r.kind === "account" ? (
                  <BrainCircuit className="size-4" />
                ) : r.kind === "deal" ? (
                  <HandshakeIcon className="size-4" />
                ) : (
                  <FileTextIcon className="size-4" />
                )}
                <span>{r.title}</span>
              </CommandItem>
            ))
          )}
        </CommandGroup>

        {(grouped.refs.length || grouped.accs.length || grouped.deals.length) ? (
          <>
            <CommandSeparator />

            {grouped.refs.length ? (
              <CommandGroup heading="Referenzen">
                {grouped.refs.map((r) => (
                  <CommandItem key={`ref:${r.id}`} onSelect={() => push(r)}>
                    <FileTextIcon className="size-4" />
                    <span>{r.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {grouped.accs.length ? (
              <CommandGroup heading="Accounts">
                {grouped.accs.map((r) => (
                  <CommandItem key={`acc:${r.id}`} onSelect={() => push(r)}>
                    <BrainCircuit className="size-4" />
                    <span>{r.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {grouped.deals.length ? (
              <CommandGroup heading="Deals">
                {grouped.deals.map((r) => (
                  <CommandItem key={`deal:${r.id}`} onSelect={() => push(r)}>
                    <HandshakeIcon className="size-4" />
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

