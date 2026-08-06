'use client'

import { SearchIcon } from '@hugeicons/core-free-icons'
import { Search, UserPlus } from 'lucide-react'

import { CompanyNameSuggestField } from '@/app/dashboard/accounts/components/company-name-suggest-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  formatExecutiveMetaLine,
  personInitials,
} from '@/lib/market-signals/champion-display'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import type { WatchedStakeholder } from './watchlist-manage-types'

export function WatchlistExecutivesPanel({
  stakeholderQuery,
  setStakeholderQuery,
  filteredStakeholders,
  newPersonName,
  setNewPersonName,
  newCompanyName,
  setNewCompanyName,
  pendingStakeholderKey,
  isPending,
  addStakeholder,
  toggleStakeholder,
}: {
  stakeholderQuery: string
  setStakeholderQuery: (value: string) => void
  filteredStakeholders: WatchedStakeholder[]
  newPersonName: string
  setNewPersonName: (value: string) => void
  newCompanyName: string
  setNewCompanyName: (value: string) => void
  pendingStakeholderKey: string | null
  isPending: boolean
  addStakeholder: () => void
  toggleStakeholder: (row: WatchedStakeholder, nextValue: boolean) => void
}) {
  return (
    <div className="space-y-6">
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
              <Search
                className="size-9 text-muted-foreground/50"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-sm font-medium text-muted-foreground">Keine Treffer</p>
            </>
          ) : (
            <>
              <UserPlus
                className="size-9 text-muted-foreground/50"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-sm font-medium text-muted-foreground">
                Noch keine Executives
              </p>
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
                row.isFollowing ? 'opacity-100' : 'opacity-50',
              )}
            >
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/35 transition-all duration-200',
                  !row.isFollowing && 'grayscale',
                )}
              >
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {personInitials(row.personName)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.personName}
                </p>
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
    </div>
  )
}
