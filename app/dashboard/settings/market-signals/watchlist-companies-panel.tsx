'use client'

import Image from 'next/image'
import { SearchIcon } from '@hugeicons/core-free-icons'

import {
  CompanySegmentSwitch,
  type CompanyWatchSegment,
} from '@/app/dashboard/settings/market-signals/company-segment-switch'
import {
  NewsroomsSidebar,
  type NewsroomSummary,
} from '@/app/dashboard/settings/market-signals/newsrooms-card'
import { CompanyNameSuggestField } from '@/app/dashboard/accounts/components/company-name-suggest-field'
import type { CompanySearchSuggestion } from '@/app/dashboard/references/new/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { rewriteBrandfetchLogoUrlForLightBackground } from '@/lib/brandfetch/logo-theme-url'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import type { ManageCompany } from './watchlist-manage-types'

export function WatchlistCompaniesPanel({
  newsroomSummary,
  query,
  setQuery,
  companySegment,
  setCompanySegment,
  onlyWatched,
  setOnlyWatched,
  addCompanyQuery,
  setAddCompanyQuery,
  addDialogOpen,
  setAddDialogOpen,
  segmentFiltered,
  filteredCompanies,
  watchedInSegment,
  emptyMessage,
  pendingId,
  bulkPending,
  addPending,
  isPending,
  toggleCompany,
  bulkSetFollowing,
  onAddCompanySuggestion,
}: {
  newsroomSummary: NewsroomSummary
  query: string
  setQuery: (value: string) => void
  companySegment: CompanyWatchSegment
  setCompanySegment: (value: CompanyWatchSegment) => void
  onlyWatched: boolean
  setOnlyWatched: (value: boolean | ((prev: boolean) => boolean)) => void
  addCompanyQuery: string
  setAddCompanyQuery: (value: string) => void
  addDialogOpen: boolean
  setAddDialogOpen: (open: boolean) => void
  segmentFiltered: ManageCompany[]
  filteredCompanies: ManageCompany[]
  watchedInSegment: number
  emptyMessage: string
  pendingId: string | null
  bulkPending: boolean
  addPending: boolean
  isPending: boolean
  toggleCompany: (companyId: string, nextValue: boolean) => void
  bulkSetFollowing: (nextValue: boolean) => void
  onAddCompanySuggestion: (suggestion: CompanySearchSuggestion) => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-4">
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
              className="h-10 rounded-xl border-input bg-card pl-10"
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
            <CompanySegmentSwitch
              value={companySegment}
              onChange={setCompanySegment}
            />
            <button
              type="button"
              aria-pressed={onlyWatched}
              onClick={() => setOnlyWatched((v) => !v)}
              className={cn(
                'h-10 rounded-xl border-input px-3 text-sm font-medium transition-colors',
                onlyWatched
                  ? 'border-foreground/20 bg-foreground text-background'
                  : 'border-border/70 bg-card text-muted-foreground hover:text-foreground',
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
            <span className="font-medium text-foreground">
              {segmentFiltered.length}
            </span>
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
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
            <p className="max-w-md text-sm text-muted-foreground">{emptyMessage}</p>
            {onlyWatched ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOnlyWatched(false)}
              >
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
              <Card
                key={company.id}
                className={cn(
                  'flex-row items-center gap-3 p-3 transition-opacity duration-200',
                  company.isFollowing ? 'opacity-100' : 'opacity-50',
                )}
              >
                <div
                  className={cn(
                    'relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/35 transition-all duration-200',
                    !company.isFollowing && 'grayscale',
                  )}
                >
                  {company.logoUrl ? (
                    <Image
                      src={
                        rewriteBrandfetchLogoUrlForLightBackground(company.logoUrl) ??
                        company.logoUrl
                      }
                      alt=""
                      fill
                      sizes="36px"
                      className="object-contain p-1"
                    />
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
              </Card>
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
              className="h-10 rounded-xl border-input"
              autoFocus
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full shrink-0 xl:w-72 2xl:w-80">
        <NewsroomsSidebar summary={newsroomSummary} />
      </div>
    </div>
  )
}
