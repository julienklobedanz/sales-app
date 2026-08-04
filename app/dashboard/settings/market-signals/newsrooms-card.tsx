'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Add01Icon, Cancel01Icon, RefreshCw } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import {
  backfillCompanyNewsroomsForMyOrg,
  updateCompanyNewsroomUrls,
} from '@/app/dashboard/market-signals/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export type NewsroomEntry = {
  id: string
  name: string
  urls: string[]
}

export type NewsroomSummary = {
  withWebsite: number
  discovered: number
  withUrls: number
  entries: NewsroomEntry[]
}

function normalizeNewsroomUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const href = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(href)
    if (!u.hostname.includes('.')) return null
    return u.href.replace(/\/$/, '')
  } catch {
    return null
  }
}

export function NewsroomsSidebar({ summary }: { summary: NewsroomSummary }) {
  const router = useRouter()
  const [refreshPending, startRefresh] = useTransition()
  const [entries, setEntries] = useState(summary.entries)
  const [prevEntries, setPrevEntries] = useState(summary.entries)
  if (summary.entries !== prevEntries) {
    setPrevEntries(summary.entries)
    setEntries(summary.entries)
  }
  const [draftById, setDraftById] = useState<Record<string, string>>({})
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const withUrls = entries.filter((e) => e.urls.length > 0).length
    return { withUrls, total: entries.length }
  }, [entries])

  function refreshNewsrooms() {
    startRefresh(async () => {
      const result = await backfillCompanyNewsroomsForMyOrg({ force: true })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        result.scanned === 0
          ? 'Keine Accounts mit Website gefunden.'
          : `${result.withUrls} von ${result.scanned} mit Newsroom`
      )
      router.refresh()
    })
  }

  async function persistUrls(companyId: string, nextUrls: string[]) {
    setPendingCompanyId(companyId)
    const prev = entries
    setEntries((list) =>
      list.map((row) => (row.id === companyId ? { ...row, urls: nextUrls } : row))
    )
    const result = await updateCompanyNewsroomUrls(companyId, nextUrls)
    setPendingCompanyId(null)
    if (!result.success) {
      setEntries(prev)
      toast.error(result.error)
      return
    }
    setEntries((list) =>
      list.map((row) => (row.id === companyId ? { ...row, urls: result.urls } : row))
    )
  }

  function removeUrl(companyId: string, url: string) {
    const row = entries.find((e) => e.id === companyId)
    if (!row) return
    void persistUrls(
      companyId,
      row.urls.filter((u) => u !== url)
    )
  }

  function addUrl(companyId: string) {
    const draft = draftById[companyId] ?? ''
    const normalized = normalizeNewsroomUrl(draft)
    if (!normalized) {
      toast.error('Bitte eine gültige URL eingeben.')
      return
    }
    const row = entries.find((e) => e.id === companyId)
    if (!row) return
    if (row.urls.some((u) => u.toLowerCase() === normalized.toLowerCase())) {
      toast.message('Quelle ist bereits hinterlegt.')
      return
    }
    setDraftById((prev) => ({ ...prev, [companyId]: '' }))
    void persistUrls(companyId, [...row.urls, normalized])
  }

  return (
    <aside className="flex max-h-[min(70vh,720px)] flex-col rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-foreground">Newsrooms</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {stats.withUrls}/{stats.total}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-lg"
          disabled={refreshPending}
          onClick={refreshNewsrooms}
          aria-label="Newsrooms aktualisieren"
          title="Newsrooms aktualisieren"
        >
          <AppIcon
            icon={RefreshCw}
            size={16}
            className={cn(refreshPending && 'animate-spin')}
          />
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          Keine Accounts mit Website.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {entries.map((entry) => {
            const busy = pendingCompanyId === entry.id
            return (
              <li key={entry.id} className={cn('space-y-1.5', busy && 'opacity-60')}>
                <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                {entry.urls.length > 0 ? (
                  <ul className="space-y-1">
                    {entry.urls.map((url) => (
                      <li
                        key={url}
                        className="group flex items-start gap-1 rounded-md bg-muted/40 px-1.5 py-1"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-[11px] leading-snug text-muted-foreground hover:text-foreground hover:underline"
                          title={url}
                        >
                          {url.replace(/^https?:\/\//i, '')}
                        </a>
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                          aria-label="Quelle entfernen"
                          disabled={busy}
                          onClick={() => removeUrl(entry.id, url)}
                        >
                          <AppIcon icon={Cancel01Icon} size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Keine Quelle</p>
                )}
                <div className="flex items-center gap-1">
                  <Input
                    value={draftById[entry.id] ?? ''}
                    onChange={(e) =>
                      setDraftById((prev) => ({ ...prev, [entry.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addUrl(entry.id)
                      }
                    }}
                    placeholder="Quelle hinzufügen…"
                    disabled={busy}
                    className="h-7 rounded-md border-border/60 px-2 text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 rounded-md"
                    disabled={busy || !(draftById[entry.id] ?? '').trim()}
                    aria-label="Quelle hinzufügen"
                    onClick={() => addUrl(entry.id)}
                  >
                    <AppIcon icon={Add01Icon} size={14} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
