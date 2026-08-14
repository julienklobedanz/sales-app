'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { searchHomepageUniversalAction } from '@/app/dashboard/command-center/actions'
import { CommandCenterHomepageResults } from '@/components/dashboard/command-center-homepage-results'
import { CommandCenterResultsSkeleton } from '@/components/dashboard/match-result-skeleton'
import { useRole } from '@/hooks/useRole'
import {
  commandCenterSuggestionsForRole,
  filterCommandCenterSuggestions,
} from '@/lib/command-center/suggestions'
import {
  loadCommandRecents,
  type CommandRecentItem,
  type CommandRecentKind,
} from '@/lib/command-center/recents'
import { firstNameFromFullName, relativeTimeDe } from '@/lib/command-center/format'
import { hrefForGlobalSearchResult } from '@/lib/command-center/global-search'
import {
  emptyHomepageSearchGroups,
  type HomepageSearchGroups,
} from '@/lib/command-center/homepage-universal-types'
import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'
import { Button } from '@/components/ui/button'

function recentTitle(item: CommandRecentItem) {
  if (item.kind === 'reference' && item.accountName?.trim()) {
    return `${item.title} — ${item.accountName.trim()}`
  }
  return item.title
}

function RecentIcon({ kind }: { kind: CommandRecentKind }) {
  if (kind === 'account')
    return <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  return <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
}

type Props = {
  greetingName: string | null
}

type SearchState = {
  referenceHits: HomepageSemanticReferenceHit[]
  groups: HomepageSearchGroups
} | null

export function CommandCenter({ greetingName }: Props) {
  const router = useRouter()
  const { systemRole, functionRole } = useRole()
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSearchAtRef = useRef(0)

  const [draft, setDraft] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>(null)
  const [recents] = useState<CommandRecentItem[]>(() => loadCommandRecents())
  const [nowMs] = useState(() => Date.now())

  const firstName = firstNameFromFullName(greetingName)
  const allSuggestions = useMemo(
    () => commandCenterSuggestionsForRole(systemRole, functionRole),
    [systemRole, functionRole],
  )
  const visibleSuggestions = useMemo(
    () => filterCommandCenterSuggestions(allSuggestions, draft),
    [allSuggestions, draft],
  )

  const hasSubmitted = submittedQuery !== null
  const displayRecents = !hasSubmitted ? recents.slice(0, 4) : []

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim()
    if (!q) {
      toast.error('Bitte eine Suchanfrage eingeben.')
      return
    }

    const now = Date.now()
    if (now - lastSearchAtRef.current < 300) return
    lastSearchAtRef.current = now

    setDraft(q)
    setSubmittedQuery(q)
    setLoading(true)
    setSearchState(null)

    try {
      const result = await searchHomepageUniversalAction(q)
      if (!result.success) {
        toast.error(result.error)
        setSearchState({ referenceHits: [], groups: emptyHomepageSearchGroups() })
        return
      }
      if (result.semanticWarning) {
        toast.message(result.semanticWarning)
      }
      setSearchState({ referenceHits: result.referenceHits, groups: result.groups })
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void runSearch(draft)
  }

  function applySuggestion(text: string, submit = true) {
    setDraft(text)
    inputRef.current?.focus()
    if (submit) void runSearch(text)
  }

  function openRecent(item: CommandRecentItem) {
    router.push(hrefForGlobalSearchResult(item))
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col pb-16">
      <div className="mx-auto mt-12 flex w-full max-w-3xl flex-col items-center px-4 text-center sm:mt-16 md:mt-20">
        <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">
          Wie kann RefStack dir heute helfen, {firstName}?
        </h2>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-white py-3.5 pl-3 pr-4 shadow-md transition-all focus-within:border-border focus-within:ring-2 focus-within:ring-slate-950/10">
              <Search className="ml-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="RefStack durchsuchen …"
                className="w-full min-w-0 bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
                aria-label="Universal-Suche"
                enterKeyHint="search"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-auto shrink-0 rounded-2xl px-6 py-3.5"
              disabled={loading || !draft.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Suche …
                </>
              ) : (
                'Suchen'
              )}
            </Button>
          </div>
        </form>

        {visibleSuggestions.length > 0 ? (
          <div className="mt-5 w-full text-left">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {draft.trim() ? 'Vorschläge' : 'Beispielanfragen'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {visibleSuggestions.map((s) => (
                <button
                  key={s.query}
                  type="button"
                  onClick={() => applySuggestion(s.query, true)}
                  className="cursor-pointer rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {hasSubmitted ? (
        <div className="mx-auto mt-10 w-full max-w-3xl px-4 sm:mt-12">
          {loading ? (
            <CommandCenterResultsSkeleton />
          ) : searchState ? (
            <CommandCenterHomepageResults
              query={submittedQuery!}
              referenceHits={searchState.referenceHits}
              groups={searchState.groups}
            />
          ) : null}
        </div>
      ) : null}

      {displayRecents.length > 0 ? (
        <div className="mx-auto mt-10 w-full max-w-3xl px-4 sm:mt-12">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Zuletzt geöffnet
          </h3>
          <ul className="space-y-1">
            {displayRecents.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  onClick={() => openRecent(item)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 text-left transition-all hover:border-border hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <RecentIcon kind={item.kind} />
                    <span className="truncate text-sm font-medium text-foreground">
                      {recentTitle(item)}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
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
