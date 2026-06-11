'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Delete02Icon, InformationCircleIcon, SearchIcon } from '@hugeicons/core-free-icons'
import { Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { setChampionWatchlistState, setCompanyWatchlistState } from '@/app/dashboard/market-signals/actions'
import {
  CompanySegmentSwitch,
  type CompanyWatchSegment,
} from '@/app/dashboard/market-signals/manage/company-segment-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDateUtcDe } from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const MANAGE_TAB_TRIGGER_CLASS =
  'h-auto rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground shadow-none transition-all hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-white dark:data-[state=active]:text-foreground'

type ManageCompany = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
  accountStatus: string | null
}

function isBestandskunde(accountStatus: string | null): boolean {
  const s = String(accountStatus ?? '').trim()
  return s === 'active_customer' || s === 'former_customer' || s === 'at_risk'
}

type WatchedStakeholder = {
  key: string
  personName: string
  companyName: string | null
  createdAt: string
}

const EXECUTIVES_INFO =
  'Für automatische Presse-Signale (Google News): Person als Stakeholder am Account pflegen oder zuerst ein manuelles Executive-Event anlegen – sonst fehlt die Firmen-Zuordnung.'

export function MarketSignalsManageClient({
  companies,
  watchedStakeholders,
}: {
  companies: ManageCompany[]
  watchedStakeholders: WatchedStakeholder[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'executives' ? 'executives' : 'companies'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [query, setQuery] = useState('')
  const [companySegment, setCompanySegment] = useState<CompanyWatchSegment>('bestand')
  const [stakeholderQuery, setStakeholderQuery] = useState('')
  const [rows, setRows] = useState(companies)
  const [stakeholderRows, setStakeholderRows] = useState(watchedStakeholders)
  const [newPersonName, setNewPersonName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingStakeholderKey, setPendingStakeholderKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredCompanies = useMemo(() => {
    const segmentFiltered = rows.filter((row) =>
      companySegment === 'bestand' ? isBestandskunde(row.accountStatus) : !isBestandskunde(row.accountStatus)
    )
    const q = query.trim().toLowerCase()
    if (!q) return segmentFiltered
    return segmentFiltered.filter((row) => row.name.toLowerCase().includes(q))
  }, [companySegment, query, rows])

  const filteredStakeholders = useMemo(() => {
    const q = stakeholderQuery.trim().toLowerCase()
    if (!q) return stakeholderRows
    return stakeholderRows.filter((row) => {
      const hay = `${row.personName} ${row.companyName ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [stakeholderQuery, stakeholderRows])

  function onTabChange(value: string) {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'executives') params.set('tab', 'executives')
    else params.delete('tab')
    const qs = params.toString()
    router.replace(qs ? `${ROUTES.marketSignalsManage}?${qs}` : ROUTES.marketSignalsManage, {
      scroll: false,
    })
  }

  function toggleCompany(companyId: string, nextValue: boolean) {
    setRows((prev) => prev.map((row) => (row.id === companyId ? { ...row, isFollowing: nextValue } : row)))
    setPendingId(companyId)
    startTransition(async () => {
      const result = await setCompanyWatchlistState(companyId, nextValue)
      setPendingId(null)
      if (!result.success) {
        setRows((prev) => prev.map((row) => (row.id === companyId ? { ...row, isFollowing: !nextValue } : row)))
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
        return
      }
      if (nextValue) {
        toast.message(
          'Account wird überwacht. In Marktsignale einmal „Feeds abrufen“ (↻) — Signale kommen aus Google News.'
        )
      }
    })
  }

  function addStakeholder() {
    const personName = newPersonName.trim()
    const companyName = newCompanyName.trim()
    if (!personName) {
      toast.error('Bitte einen Stakeholder-Namen eingeben.')
      return
    }
    const key = personName.toLowerCase().replace(/\s+/g, ' ')
    const optimistic: WatchedStakeholder = {
      key,
      personName,
      companyName: companyName || null,
      createdAt: new Date().toISOString(),
    }
    setStakeholderRows((prev) => {
      if (prev.some((row) => row.key === key)) {
        return prev.map((row) => (row.key === key ? { ...row, companyName: optimistic.companyName } : row))
      }
      return [optimistic, ...prev]
    })
    setPendingStakeholderKey(key)
    startTransition(async () => {
      const result = await setChampionWatchlistState(personName, true, companyName || null)
      setPendingStakeholderKey(null)
      if (!result.success) {
        setStakeholderRows(watchedStakeholders)
        toast.error(result.error ?? 'Überwachung konnte nicht gestartet werden')
        return
      }
      setNewPersonName('')
      setNewCompanyName('')
      toast.success('Stakeholder wird überwacht.')
      router.refresh()
    })
  }

  function removeStakeholder(row: WatchedStakeholder) {
    setStakeholderRows((prev) => prev.filter((item) => item.key !== row.key))
    setPendingStakeholderKey(row.key)
    startTransition(async () => {
      const result = await setChampionWatchlistState(row.personName, false)
      setPendingStakeholderKey(null)
      if (!result.success) {
        setStakeholderRows(watchedStakeholders)
        toast.error(result.error ?? 'Stakeholder konnte nicht entfernt werden')
      }
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Marktsignale einrichten</h1>
          <Link href={ROUTES.marketSignals} className="text-sm text-muted-foreground hover:text-foreground">
            Zurück zu Marktsignalen
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="gap-6">
          <TabsList className="inline-flex h-auto w-fit gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger value="companies" className={MANAGE_TAB_TRIGGER_CLASS}>
              Unternehmen überwachen
            </TabsTrigger>
            <TabsTrigger value="executives" className={cn(MANAGE_TAB_TRIGGER_CLASS, 'inline-flex items-center gap-1.5')}>
              Stakeholder / Executives
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Hinweis zu Stakeholder-Überwachung"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AppIcon icon={InformationCircleIcon} size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  {EXECUTIVES_INFO}
                </TooltipContent>
              </Tooltip>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md sm:flex-1">
                <AppIcon
                  icon={SearchIcon}
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Accounts durchsuchen"
                  className="h-10 rounded-xl border-border/70 bg-card pl-10"
                />
              </div>

              <CompanySegmentSwitch
                value={companySegment}
                onChange={setCompanySegment}
              />
            </div>

            {filteredCompanies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? 'Keine Accounts gefunden.'
                  : companySegment === 'bestand'
                    ? 'Keine Bestandskunden in RefStack — legen Sie Accounts mit Status „Aktiver Kunde“, „Ehemaliger Kunde“ oder „Account at Risk“ an.'
                    : 'Keine Neukunden in RefStack — Targets und Accounts ohne Kundenstatus erscheinen hier.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-slate-900/5 transition-opacity duration-200',
                      company.isFollowing ? 'opacity-100' : 'opacity-50'
                    )}
                  >
                    <div
                      className={cn(
                        'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/35 transition-all duration-200',
                        !company.isFollowing && 'grayscale'
                      )}
                    >
                      {company.logoUrl ? (
                        <Image src={company.logoUrl} alt="" fill sizes="36px" className="object-contain p-1" />
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {company.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {company.name}
                    </span>
                    <Switch
                      checked={company.isFollowing}
                      disabled={isPending && pendingId === company.id}
                      onCheckedChange={(checked) => toggleCompany(company.id, checked)}
                      aria-label={`${company.name} überwachen`}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="executives" className="mt-0 space-y-5">
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm shadow-slate-900/5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <label htmlFor="stakeholder-name" className="text-xs font-medium text-muted-foreground">
                    Name des Stakeholders
                  </label>
                  <Input
                    id="stakeholder-name"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="z. B. Tim Cook"
                    className="h-10 rounded-xl border-border/60 bg-background"
                    disabled={isPending && !!pendingStakeholderKey}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="stakeholder-company" className="text-xs font-medium text-muted-foreground">
                    Unternehmen
                  </label>
                  <Input
                    id="stakeholder-company"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="z. B. Apple"
                    className="h-10 rounded-xl border-border/60 bg-background"
                    disabled={isPending && !!pendingStakeholderKey}
                  />
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={addStakeholder}
                  disabled={isPending && !!pendingStakeholderKey}
                  className="h-10 rounded-xl px-4"
                >
                  + Überwachung starten
                </Button>
              </div>
            </div>

            <div className="relative max-w-md">
              <AppIcon
                icon={SearchIcon}
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={stakeholderQuery}
                onChange={(event) => setStakeholderQuery(event.target.value)}
                placeholder="Stakeholder durchsuchen"
                className="h-10 rounded-xl border-border/70 bg-card pl-10"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
              {filteredStakeholders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 bg-muted/20 px-6 py-14 text-center">
                  {stakeholderQuery.trim() ? (
                    <>
                      <Search className="size-9 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground">Keine Treffer</p>
                      <p className="max-w-xs text-xs text-muted-foreground/80">
                        Passen Sie die Suche an oder fügen Sie oben einen neuen Stakeholder hinzu.
                      </p>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-9 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground">Noch keine Stakeholder</p>
                      <p className="max-w-xs text-xs text-muted-foreground/80">
                        Tragen Sie Name und Unternehmen ein und starten Sie die Überwachung — Presse-Signale
                        erscheinen dann in Marktsignalen.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border/70">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Unternehmen
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                        Seit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="sr-only">Entfernen</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 bg-card">
                    {filteredStakeholders.map((row) => (
                      <tr key={row.key} className="text-sm">
                        <td className="px-4 py-3 font-medium text-foreground">{row.personName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.companyName ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {formatDateUtcDe(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={isPending && pendingStakeholderKey === row.key}
                            onClick={() => removeStakeholder(row)}
                            aria-label={`${row.personName} entfernen`}
                          >
                            <AppIcon icon={Delete02Icon} size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
