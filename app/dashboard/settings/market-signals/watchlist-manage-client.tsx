'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, Building2, Users } from '@hugeicons/core-free-icons'
import { Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  setChampionWatchlistState,
  setCompaniesWatchlistState,
  setCompanyWatchlistState,
  watchCompanyFromSuggestion,
} from '@/app/dashboard/market-signals/actions'
import {
  CompanySegmentSwitch,
  type CompanyWatchSegment,
} from '@/app/dashboard/settings/market-signals/company-segment-switch'
import { CompanyNameSuggestField } from '@/app/dashboard/accounts/components/company-name-suggest-field'
import type { CompanySearchSuggestion } from '@/app/dashboard/references/new/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AppIcon } from '@/lib/icons'
import {
  formatExecutiveMetaLine,
  personInitials,
} from '@/lib/market-signals/champion-display'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

const MANAGE_TAB_BUTTON_CLASS =
  'inline-flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground shadow-none transition-colors hover:bg-muted/50 hover:text-foreground'

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

function compareWatchlistCompanies(a: ManageCompany, b: ManageCompany): number {
  if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
}

type WatchedStakeholder = {
  key: string
  personName: string
  companyName: string | null
  personTitle: string | null
  createdAt: string
  isFollowing: boolean
}

function compareStakeholders(a: WatchedStakeholder, b: WatchedStakeholder): number {
  if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
  return a.personName.localeCompare(b.personName, 'de', { sensitivity: 'base' })
}

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
  const [companySegment, setCompanySegment] = useState<CompanyWatchSegment>('neu')
  const [onlyWatched, setOnlyWatched] = useState(false)
  const [addCompanyQuery, setAddCompanyQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [stakeholderQuery, setStakeholderQuery] = useState('')
  const [rows, setRows] = useState(companies)
  const [stakeholderRows, setStakeholderRows] = useState(watchedStakeholders)
  const [newPersonName, setNewPersonName] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [pendingStakeholderKey, setPendingStakeholderKey] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [addPending, setAddPending] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(companies)
  }, [companies])

  useEffect(() => {
    setStakeholderRows(watchedStakeholders)
  }, [watchedStakeholders])

  const segmentFiltered = useMemo(() => {
    return rows.filter((row) => {
      if (companySegment === 'all') return true
      return companySegment === 'bestand'
        ? isBestandskunde(row.accountStatus)
        : !isBestandskunde(row.accountStatus)
    })
  }, [companySegment, rows])

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase()
    const searched = q
      ? segmentFiltered.filter((row) => row.name.toLowerCase().includes(q))
      : segmentFiltered
    const watched = onlyWatched ? searched.filter((row) => row.isFollowing) : searched
    return [...watched].sort(compareWatchlistCompanies)
  }, [onlyWatched, query, segmentFiltered])

  const watchedInSegment = useMemo(
    () => segmentFiltered.filter((row) => row.isFollowing).length,
    [segmentFiltered]
  )

  const filteredStakeholders = useMemo(() => {
    const q = stakeholderQuery.trim().toLowerCase()
    const searched = q
      ? stakeholderRows.filter((row) => {
          const hay = `${row.personName} ${row.companyName ?? ''}`.toLowerCase()
          return hay.includes(q)
        })
      : stakeholderRows
    return [...searched].sort(compareStakeholders)
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
    setRows((prev) =>
      prev
        .map((row) => (row.id === companyId ? { ...row, isFollowing: nextValue } : row))
        .sort(compareWatchlistCompanies)
    )
    setPendingId(companyId)
    startTransition(async () => {
      const result = await setCompanyWatchlistState(companyId, nextValue)
      setPendingId(null)
      if (!result.success) {
        setRows((prev) =>
          prev
            .map((row) => (row.id === companyId ? { ...row, isFollowing: !nextValue } : row))
            .sort(compareWatchlistCompanies)
        )
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  function bulkSetFollowing(nextValue: boolean) {
    const ids = filteredCompanies
      .filter((row) => row.isFollowing !== nextValue)
      .map((row) => row.id)
    if (ids.length === 0) {
      toast.message(nextValue ? 'Alle sichtbaren Accounts sind bereits aktiv.' : 'Keine aktiven Accounts in der Ansicht.')
      return
    }
    const idSet = new Set(ids)
    setRows((prev) =>
      prev
        .map((row) => (idSet.has(row.id) ? { ...row, isFollowing: nextValue } : row))
        .sort(compareWatchlistCompanies)
    )
    setBulkPending(true)
    startTransition(async () => {
      const result = await setCompaniesWatchlistState(ids, nextValue)
      setBulkPending(false)
      if (!result.success) {
        setRows(companies)
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
        return
      }
      toast.success(
        nextValue
          ? `${ids.length} Account${ids.length === 1 ? '' : 's'} aktiviert`
          : `${ids.length} Account${ids.length === 1 ? '' : 's'} deaktiviert`
      )
    })
  }

  async function onAddCompanySuggestion(suggestion: CompanySearchSuggestion) {
    setAddPending(true)
    try {
      const result = await watchCompanyFromSuggestion({
        id: suggestion.id,
        name: suggestion.name,
      })
      if (!result.success) {
        toast.error(result.error ?? 'Account konnte nicht hinzugefügt werden')
        return
      }
      setRows((prev) => {
        const without = prev.filter((row) => row.id !== result.company.id)
        return [...without, result.company].sort(compareWatchlistCompanies)
      })
      setAddCompanyQuery('')
      setAddDialogOpen(false)
      toast.success(`${result.company.name} wird beobachtet`)
      router.refresh()
    } finally {
      setAddPending(false)
    }
  }

  function addStakeholder() {
    const personName = newPersonName.trim()
    const companyName = newCompanyName.trim()
    if (!personName) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }
    const key = personName.toLowerCase().replace(/\s+/g, ' ')
    const optimistic: WatchedStakeholder = {
      key,
      personName,
      companyName: companyName || null,
      personTitle: null,
      createdAt: new Date().toISOString(),
      isFollowing: true,
    }
    setStakeholderRows((prev) => {
      const without = prev.filter((row) => row.key !== key)
      return [...without, optimistic].sort(compareStakeholders)
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
      router.refresh()
    })
  }

  function toggleStakeholder(row: WatchedStakeholder, nextValue: boolean) {
    setStakeholderRows((prev) =>
      prev
        .map((item) => (item.key === row.key ? { ...item, isFollowing: nextValue } : item))
        .sort(compareStakeholders)
    )
    setPendingStakeholderKey(row.key)
    startTransition(async () => {
      const result = await setChampionWatchlistState(
        row.personName,
        nextValue,
        row.companyName
      )
      setPendingStakeholderKey(null)
      if (!result.success) {
        setStakeholderRows((prev) =>
          prev
            .map((item) => (item.key === row.key ? { ...item, isFollowing: !nextValue } : item))
            .sort(compareStakeholders)
        )
        toast.error(result.error ?? 'Watchlist konnte nicht aktualisiert werden')
      }
    })
  }

  const emptyMessage = (() => {
    if (query.trim()) return 'Keine Accounts gefunden.'
    if (onlyWatched) {
      return watchedInSegment === 0
        ? 'In diesem Segment wird noch kein Account beobachtet.'
        : 'Keine Treffer für „Nur Beobachtete“ mit der aktuellen Suche.'
    }
    if (companySegment === 'bestand') {
      return 'Keine Bestandskunden in RefStack — legen Sie Accounts mit Status „Aktiver Kunde“, „Ehemaliger Kunde“ oder „Account at Risk“ an.'
    }
    if (companySegment === 'neu') {
      return 'Keine Neukunden in RefStack — Targets und Accounts ohne Kundenstatus erscheinen hier.'
    }
    return 'Noch keine Accounts in RefStack.'
  })()

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Marktsignale verwalten
          </h1>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <Link
            href={ROUTES.marketSignals}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Zurück zu Marktsignalen
          </Link>
          <Link href={ROUTES.settings} className="text-xs text-muted-foreground hover:text-foreground">
            Einstellungen
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="gap-6">
        <div role="tablist" aria-label="Bereich" className="flex w-full items-center justify-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'companies'}
                aria-label="Accounts"
                onClick={() => onTabChange('companies')}
                className={cn(
                  MANAGE_TAB_BUTTON_CLASS,
                  activeTab === 'companies'
                    ? 'border-primary bg-primary text-white shadow-sm hover:bg-primary hover:text-white'
                    : null
                )}
              >
                <AppIcon
                  icon={Building2}
                  size={20}
                  color={activeTab === 'companies' ? '#ffffff' : 'currentColor'}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Accounts</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'executives'}
                aria-label="Executives"
                onClick={() => onTabChange('executives')}
                className={cn(
                  MANAGE_TAB_BUTTON_CLASS,
                  activeTab === 'executives'
                    ? 'border-primary bg-primary text-white shadow-sm hover:bg-primary hover:text-white'
                    : null
                )}
              >
                <AppIcon
                  icon={Users}
                  size={20}
                  color={activeTab === 'executives' ? '#ffffff' : 'currentColor'}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Executives</TooltipContent>
          </Tooltip>
        </div>

        <TabsContent value="companies" className="mt-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="relative w-full md:w-[calc((100%-2rem)/3)]">
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
            <Button
              type="button"
              className="size-10 shrink-0 rounded-xl px-0 text-lg"
              onClick={() => setAddDialogOpen(true)}
              aria-label="Account hinzufügen"
            >
              +
            </Button>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <CompanySegmentSwitch value={companySegment} onChange={setCompanySegment} />
              <button
                type="button"
                aria-pressed={onlyWatched}
                onClick={() => setOnlyWatched((v) => !v)}
                className={cn(
                  'h-10 rounded-xl border px-3 text-sm font-medium transition-colors',
                  onlyWatched
                    ? 'border-foreground/20 bg-foreground text-background'
                    : 'border-border/70 bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                Nur Beobachtete
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{watchedInSegment}</span>
              {' von '}
              <span className="font-medium text-foreground">{segmentFiltered.length}</span>
              {' beobachtet'}
              {filteredCompanies.length !== segmentFiltered.length
                ? ` · ${filteredCompanies.length} angezeigt`
                : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={bulkPending || isPending || filteredCompanies.length === 0}
                onClick={() => bulkSetFollowing(true)}
              >
                Alle an
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={bulkPending || isPending || filteredCompanies.length === 0}
                onClick={() => bulkSetFollowing(false)}
              >
                Alle aus
              </Button>
            </div>
          </div>

          {filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
              {onlyWatched ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setOnlyWatched(false)}>
                  Alle anzeigen
                </Button>
              ) : null}
              {!query.trim() && !onlyWatched && companySegment !== 'bestand' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-9 rounded-lg px-0 text-lg"
                  onClick={() => setAddDialogOpen(true)}
                  aria-label="Account hinzufügen"
                >
                  +
                </Button>
              ) : null}
            </div>
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
                    disabled={(isPending && pendingId === company.id) || bulkPending}
                    onCheckedChange={(checked) => toggleCompany(company.id, checked)}
                    aria-label={`${company.name} überwachen`}
                  />
                </div>
              ))}
            </div>
          )}

          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open)
              if (!open) setAddCompanyQuery('')
            }}
          >
            <DialogContent className="overflow-visible sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Account hinzufügen</DialogTitle>
              </DialogHeader>
              <CompanyNameSuggestField
                id="add-watch-company"
                value={addCompanyQuery}
                onValueChange={setAddCompanyQuery}
                onSelectSuggestion={onAddCompanySuggestion}
                disabled={addPending || isPending}
                placeholder="Firma suchen oder neu anlegen …"
                className="h-10 rounded-xl border-border/60"
                autoFocus
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="executives" className="mt-0 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Input
              id="stakeholder-name"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Name, z. B. Tim Cook"
              className="h-10 w-full rounded-xl border-border/70 bg-card md:w-[calc((100%-2rem)/3)]"
              disabled={isPending && !!pendingStakeholderKey}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addStakeholder()
                }
              }}
            />
            <div className="w-full md:w-[calc((100%-2rem)/3)]">
              <CompanyNameSuggestField
                id="stakeholder-company"
                value={newCompanyName}
                onValueChange={setNewCompanyName}
                onSelectSuggestion={(s) => setNewCompanyName(s.name)}
                disabled={isPending && !!pendingStakeholderKey}
                placeholder="Unternehmen, z. B. Apple"
                className="h-10 rounded-xl border-border/70"
              />
            </div>
            <Button
              type="button"
              variant="default"
              onClick={addStakeholder}
              disabled={isPending && !!pendingStakeholderKey}
              className="size-10 shrink-0 rounded-xl px-0 text-lg"
              aria-label="Hinzufügen"
            >
              +
            </Button>
          </div>

          <div className="relative w-full md:w-[calc((100%-2rem)/3)]">
            <AppIcon
              icon={SearchIcon}
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={stakeholderQuery}
              onChange={(event) => setStakeholderQuery(event.target.value)}
              placeholder="Durchsuchen"
              className="h-10 rounded-xl border-border/70 bg-card pl-10"
            />
          </div>

          {filteredStakeholders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
              {stakeholderQuery.trim() ? (
                <>
                  <Search className="size-9 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                  <p className="text-sm font-medium text-muted-foreground">Keine Treffer</p>
                </>
              ) : (
                <>
                  <UserPlus className="size-9 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                  <p className="text-sm font-medium text-muted-foreground">Noch keine Executives</p>
                  <p className="max-w-xs text-xs text-muted-foreground/80">
                    Name und Unternehmen eintragen.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {filteredStakeholders.map((row) => (
                <div
                  key={row.key}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm shadow-slate-900/5 transition-opacity duration-200',
                    row.isFollowing ? 'opacity-100' : 'opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/35 transition-all duration-200',
                      !row.isFollowing && 'grayscale'
                    )}
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {personInitials(row.personName)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.personName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatExecutiveMetaLine(row.personTitle, row.companyName)}
                    </p>
                  </div>
                  <Switch
                    checked={row.isFollowing}
                    disabled={isPending && pendingStakeholderKey === row.key}
                    onCheckedChange={(checked) => toggleStakeholder(row, checked)}
                    aria-label={`${row.personName} überwachen`}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  )
}
