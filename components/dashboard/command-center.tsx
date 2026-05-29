'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Building2, FileText, Loader2, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { commandCenterSuggestionsForRole } from '@/lib/command-center/suggestions'
import {
  loadCommandRecents,
  type CommandRecentItem,
  type CommandRecentKind,
} from '@/lib/command-center/recents'
import { firstNameFromFullName, relativeTimeDe } from '@/lib/command-center/format'
import {
  formatReferenceListLabel,
  hrefForGlobalSearchResult,
  searchGlobalEntities,
  type GlobalSearchResult,
} from '@/lib/command-center/global-search'
import { pushCommandRecent } from '@/lib/command-center/push-recent'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'

function recentTitle(item: CommandRecentItem) {
  if (item.kind === 'reference' && item.accountName?.trim()) {
    return `${item.title} — ${item.accountName.trim()}`
  }
  return item.title
}

function RecentIcon({ kind }: { kind: CommandRecentKind }) {
  if (kind === 'deal') return <Briefcase className="size-4 shrink-0 text-slate-500" aria-hidden />
  if (kind === 'account') return <Building2 className="size-4 shrink-0 text-slate-500" aria-hidden />
  return <FileText className="size-4 shrink-0 text-slate-500" aria-hidden />
}

function ResultIcon({ kind }: { kind: GlobalSearchResult['kind'] }) {
  if (kind === 'deal') return <Briefcase className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  if (kind === 'account') return <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  return <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

type Props = {
  greetingName: string | null
}

export function CommandCenter({ greetingName }: Props) {
  const router = useRouter()
  const { role } = useRole()
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [recents, setRecents] = useState<CommandRecentItem[]>([])
  const [nowMs] = useState(() => Date.now())

  const firstName = firstNameFromFullName(greetingName)
  const suggestions = useMemo(() => commandCenterSuggestionsForRole(role), [role])
  const displayRecents = recents.slice(0, 4)
  const showEmptyPulseCaret = focused && query.length === 0
  const showResults = focused && query.trim().length > 0

  const refreshRecents = useCallback(() => {
    setRecents(loadCommandRecents())
  }, [])

  useEffect(() => {
    refreshRecents()
    inputRef.current?.focus()
  }, [refreshRecents])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const handle = window.setTimeout(async () => {
      setLoading(true)
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
  }, [query, supabase])

  const grouped = useMemo(() => {
    return {
      refs: results.filter((r) => r.kind === 'reference'),
      accounts: results.filter((r) => r.kind === 'account'),
      deals: results.filter((r) => r.kind === 'deal'),
    }
  }, [results])

  function applySuggestion(text: string) {
    setQuery(text)
    inputRef.current?.focus()
  }

  function selectResult(item: GlobalSearchResult) {
    pushCommandRecent({
      kind: item.kind,
      id: item.id,
      title: item.title,
      accountName: item.kind === 'reference' ? item.accountName : undefined,
    })
    refreshRecents()
    setFocused(false)
    setQuery('')
    router.push(hrefForGlobalSearchResult(item))
  }

  function openRecent(item: CommandRecentItem) {
    router.push(hrefForGlobalSearchResult(item))
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col">
      <div className="mx-auto mt-12 flex w-full max-w-3xl flex-col items-center px-4 text-center sm:mt-16 md:mt-20">
        <h2 className="mb-6 text-xl font-medium tracking-tight text-slate-800">
          Wie kann RefStack dir heute helfen, {firstName}?
        </h2>

        <div className="relative w-full">
          <div
            className={cn(
              'flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 pl-3 pr-4 shadow-md transition-all duration-200',
              focused && 'border-slate-300 ring-2 ring-slate-950/10'
            )}
          >
            <Search className="ml-1 size-5 shrink-0 text-slate-400" aria-hidden />
            <div className="relative min-w-0 flex-1">
              {showEmptyPulseCaret ? (
                <span
                  className="command-center-caret pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2"
                  aria-hidden
                />
              ) : null}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setFocused(false), 160)
                }}
                placeholder="Suche nach NDAs, Referenzen, Aufgaben oder System-Einstellungen…"
                className={cn(
                  'relative z-[1] w-full min-w-0 bg-transparent text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400',
                  showEmptyPulseCaret && 'caret-transparent'
                )}
                autoComplete="off"
                spellCheck={false}
                aria-label="Globale Suche"
                role="combobox"
                aria-expanded={showResults}
                aria-controls="command-center-results"
              />
            </div>
          </div>

          {showResults ? (
            <div
              id="command-center-results"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(360px,50vh)] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white py-2 text-left shadow-lg"
            >
              {loading ? (
                <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {COPY.commandPalette.searchLoading}
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  {COPY.commandPalette.searchEmpty}
                </p>
              ) : (
                <div className="space-y-1 px-1">
                  {grouped.refs.length > 0 ? (
                    <ResultGroup label="Referenzen">
                      {grouped.refs.map((r) => (
                        <ResultRow
                          key={`ref:${r.id}`}
                          item={r}
                          label={formatReferenceListLabel(r.title, r.accountName)}
                          onSelect={() => selectResult(r)}
                        />
                      ))}
                    </ResultGroup>
                  ) : null}
                  {grouped.accounts.length > 0 ? (
                    <ResultGroup label="Accounts">
                      {grouped.accounts.map((r) => (
                        <ResultRow
                          key={`acc:${r.id}`}
                          item={r}
                          label={r.title}
                          onSelect={() => selectResult(r)}
                        />
                      ))}
                    </ResultGroup>
                  ) : null}
                  {grouped.deals.length > 0 ? (
                    <ResultGroup label="Deals">
                      {grouped.deals.map((r) => (
                        <ResultRow
                          key={`deal:${r.id}`}
                          item={r}
                          label={r.title}
                          onSelect={() => selectResult(r)}
                        />
                      ))}
                    </ResultGroup>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {suggestions.map((s) => (
            <button
              key={s.query}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applySuggestion(s.query)}
              className="cursor-pointer rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {displayRecents.length > 0 ? (
        <div className="mx-auto mt-10 w-full max-w-3xl px-4 sm:mt-12">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Zuletzt geöffnet
          </h3>
          <ul className="space-y-1">
            {displayRecents.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  onClick={() => openRecent(item)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 text-left transition-all hover:border-slate-100 hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <RecentIcon kind={item.kind} />
                    <span className="truncate text-sm font-medium text-slate-800">
                      {recentTitle(item)}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {relativeTimeDe(item.at, nowMs)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  item,
  label,
  onSelect,
}: {
  item: GlobalSearchResult
  label: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-800 transition-colors hover:bg-slate-50"
    >
      <ResultIcon kind={item.kind} />
      <span className="min-w-0 truncate text-left">{label}</span>
    </button>
  )
}
