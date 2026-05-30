'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, Loader2, Search } from 'lucide-react'
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
  emptyCommandSearchGroups,
  searchCommandCenter,
  type CommandSearchGroups,
  type CommandSearchResult,
} from '@/lib/command-center/global-search'
import { hrefForCommandSearchResult } from '@/lib/command-center/search-navigation'
import { hrefForGlobalSearchResult } from '@/lib/command-center/global-search'
import { pushCommandRecent } from '@/lib/command-center/push-recent'
import { getNdaAgreementDownloadUrl } from '@/app/dashboard/accounts/nda-actions'
import { getComplianceDocumentDownloadUrl } from '@/app/dashboard/settings/compliance-actions'
import { CommandCenterSearchResults } from '@/components/dashboard/command-center-search-results'
import { cn } from '@/lib/utils'

function recentTitle(item: CommandRecentItem) {
  if (item.kind === 'reference' && item.accountName?.trim()) {
    return `${item.title} — ${item.accountName.trim()}`
  }
  return item.title
}

function RecentIcon({ kind }: { kind: CommandRecentKind }) {
  if (kind === 'account') return <Building2 className="size-4 shrink-0 text-slate-500" aria-hidden />
  return <FileText className="size-4 shrink-0 text-slate-500" aria-hidden />
}

function pushRecentForResult(item: CommandSearchResult) {
  if (item.kind === 'reference') {
    pushCommandRecent({
      kind: 'reference',
      id: item.id,
      title: item.title,
      accountName: item.accountName,
    })
    return
  }
  if (item.kind === 'account') {
    pushCommandRecent({ kind: 'account', id: item.id, title: item.title })
    return
  }
  if (item.kind === 'nda') {
    pushCommandRecent({ kind: 'account', id: item.companyId, title: item.companyName })
    return
  }
  if (item.kind === 'market_signal') {
    pushCommandRecent({ kind: 'account', id: item.companyId, title: item.companyName })
  }
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
  const [groups, setGroups] = useState<CommandSearchGroups>(emptyCommandSearchGroups)
  const [recents, setRecents] = useState<CommandRecentItem[]>([])
  const [nowMs] = useState(() => Date.now())

  const firstName = firstNameFromFullName(greetingName)
  const suggestions = useMemo(() => commandCenterSuggestionsForRole(role), [role])
  const displayRecents = recents.slice(0, 4)
  const showEmptyPulseCaret = focused && query.length === 0
  const showResultsPanel = focused && query.trim().length > 0

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
      setGroups(emptyCommandSearchGroups())
      setLoading(false)
      return
    }

    let cancelled = false
    const handle = window.setTimeout(async () => {
      setLoading(true)
      const next = await searchCommandCenter(supabase, q)
      if (!cancelled) {
        setGroups(next)
        setLoading(false)
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, supabase])

  function applySuggestion(text: string) {
    setQuery(text)
    inputRef.current?.focus()
  }

  async function selectResult(item: CommandSearchResult) {
    if (item.kind === 'nda' && item.hasFile) {
      const dl = await getNdaAgreementDownloadUrl(item.id, item.companyId)
      if (dl.success) {
        window.open(dl.url, '_blank', 'noopener,noreferrer')
      }
    }
    if (item.kind === 'certificate' && item.hasFile) {
      const dl = await getComplianceDocumentDownloadUrl(item.id)
      if (dl.success) {
        window.open(dl.url, '_blank', 'noopener,noreferrer')
        pushRecentForResult(item)
        refreshRecents()
        setFocused(false)
        setQuery('')
        return
      }
    }

    pushRecentForResult(item)
    refreshRecents()
    setFocused(false)
    setQuery('')
    router.push(hrefForCommandSearchResult(item))
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
                  window.setTimeout(() => setFocused(false), 180)
                }}
                placeholder="Suche nach NDAs, Referenzen, RFPs, Marktsignale…"
                className={cn(
                  'relative z-[1] w-full min-w-0 bg-transparent text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400',
                  showEmptyPulseCaret && 'caret-transparent'
                )}
                autoComplete="off"
                spellCheck={false}
                aria-label="Globale Suche"
                role="combobox"
                aria-expanded={showResultsPanel}
                aria-controls="command-center-results"
              />
            </div>
            {loading && query.trim() ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" aria-hidden />
            ) : null}
          </div>

          {showResultsPanel ? (
            <div
              id="command-center-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in-50 slide-in-from-top-1 duration-150"
            >
              <CommandCenterSearchResults
                query={query}
                loading={loading}
                groups={groups}
                onSelect={(item) => void selectResult(item)}
              />
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
