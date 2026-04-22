'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { SearchIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { setCompanyWatchlistState } from '@/app/dashboard/market-signals/actions'
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

export function MarketSignalsManageClient({ companies }: { companies: ManageCompany[] }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(companies)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.name.toLowerCase().includes(q))
  }, [query, rows])

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

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Watchlist verwalten</h1>
        <Link href={ROUTES.marketSignals} className="text-sm text-muted-foreground hover:text-foreground">
          Zurueck zu Marktsignalen
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
    </div>
  )
}
