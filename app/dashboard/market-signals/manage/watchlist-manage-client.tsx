'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SearchIcon, Sparkles } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { setChampionWatchlistState, setCompanyWatchlistState } from '@/app/dashboard/market-signals/actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

type ManageCompany = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
}

type ManageChampion = {
  key: string
  personName: string
  companyName: string | null
  detectedCount: number
  isFollowing: boolean
}

export function MarketSignalsManageClient({
  companies,
  champions,
}: {
  companies: ManageCompany[]
  champions: ManageChampion[]
}) {
  const searchParams = useSearchParams()
  const championsSectionRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [championQuery, setChampionQuery] = useState('')
  const [rows, setRows] = useState(companies)
  const [championRows, setChampionRows] = useState(champions)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingChampionKey, setPendingChampionKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isChampionsView = searchParams.get('view') === 'champions'

  useEffect(() => {
    if (!isChampionsView) return
    const el = championsSectionRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isChampionsView])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.name.toLowerCase().includes(q))
  }, [query, rows])

  const filteredChampions = useMemo(() => {
    const q = championQuery.trim().toLowerCase()
    if (!q) return championRows
    return championRows.filter((row) => {
      const hay = `${row.personName} ${row.companyName ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [championQuery, championRows])

  function toggleRow(companyId: string, nextValue: boolean) {
    setRows((prev) => prev.map((row) => (row.id === companyId ? { ...row, isFollowing: nextValue } : row)))
    setPendingId(companyId)
    startTransition(async () => {
      const result = await setCompanyWatchlistState(companyId, nextValue)
      setPendingId(null)
      if (!result.success) {
        setRows((prev) => prev.map((row) => (row.id === companyId ? { ...row, isFollowing: !nextValue } : row)))
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  function toggleChampionRow(championKey: string, personName: string, nextValue: boolean) {
    setChampionRows((prev) =>
      prev.map((row) => (row.key === championKey ? { ...row, isFollowing: nextValue } : row))
    )
    setPendingChampionKey(championKey)
    startTransition(async () => {
      const result = await setChampionWatchlistState(personName, nextValue)
      setPendingChampionKey(null)
      if (!result.success) {
        setChampionRows((prev) =>
          prev.map((row) => (row.key === championKey ? { ...row, isFollowing: !nextValue } : row))
        )
        toast.error(result.error ?? 'Champion-Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Watchlist verwalten</h1>
        <Link href={ROUTES.marketSignals} className="text-sm text-muted-foreground hover:text-foreground">
          Zurück zu Marktsignalen
        </Link>
      </div>

      <div className="relative">
        <AppIcon icon={SearchIcon} size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Accounts durchsuchen"
          className="h-10 rounded-lg border-border/70 bg-card pl-10"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
        <ul className="divide-y divide-border/70">
          {filtered.map((company) => (
            <li key={company.id} className="flex items-center gap-3 px-4 py-3.5">
              <Checkbox
                checked={company.isFollowing}
                disabled={isPending && pendingId === company.id}
                onCheckedChange={(checked) => toggleRow(company.id, checked === true)}
                aria-label={`${company.name} zur Watchlist hinzufügen`}
              />
              <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-md bg-muted/35">
                {company.logoUrl ? (
                  <Image src={company.logoUrl} alt="" fill sizes="32px" className="object-contain p-1" />
                ) : (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {company.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{company.name}</span>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Keine Accounts gefunden.</li>
          ) : null}
        </ul>
      </div>

      <div
        id="champions-section"
        ref={championsSectionRef}
        className={`space-y-2.5 rounded-xl p-1.5 transition-colors ${
          isChampionsView ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <AppIcon icon={Sparkles} size={16} className="text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Champions verwalten</h2>
          {isChampionsView ? (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              Aktiv
            </span>
          ) : null}
        </div>
        <div className="relative">
          <AppIcon icon={SearchIcon} size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={championQuery}
            onChange={(event) => setChampionQuery(event.target.value)}
            placeholder="Champions durchsuchen"
            className="h-10 rounded-lg border-border/70 bg-card pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
        <ul className="divide-y divide-border/70">
          {filteredChampions.map((champion) => (
            <li key={champion.key} className="flex items-center gap-3 px-4 py-3.5">
              <Checkbox
                checked={champion.isFollowing}
                disabled={isPending && pendingChampionKey === champion.key}
                onCheckedChange={(checked) =>
                  toggleChampionRow(champion.key, champion.personName, checked === true)
                }
                aria-label={`${champion.personName} zur Champion-Watchlist hinzufügen`}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{champion.personName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {champion.companyName ?? 'Ohne Firma'} · {champion.detectedCount} Signal
                    {champion.detectedCount === 1 ? '' : 'e'}
                  </p>
                </div>
              </div>
            </li>
          ))}
          {filteredChampions.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Keine Champions gefunden.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
