'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import type { NewsroomSummary } from '@/app/(app)/settings/market-signals/newsrooms-card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ROUTES } from '@/lib/routes'

import { useWatchlistCompanies } from './use-watchlist-companies'
import { useWatchlistStakeholders } from './use-watchlist-stakeholders'
import { WatchlistCompaniesPanel } from './watchlist-companies-panel'
import { WatchlistExecutivesPanel } from './watchlist-executives-panel'
import { WatchlistManageHeader } from './watchlist-manage-header'
import { WatchlistManageTabList } from './watchlist-manage-tab-list'
import type {
  ManageCompany,
  ManageWatchlistTab,
  WatchedStakeholder,
} from './watchlist-manage-types'

export type { ManageCompany, WatchedStakeholder }

export function MarketSignalsManageClient({
  companies,
  watchedStakeholders,
  newsroomSummary,
}: {
  companies: ManageCompany[]
  watchedStakeholders: WatchedStakeholder[]
  newsroomSummary: NewsroomSummary
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab: ManageWatchlistTab =
    searchParams.get('tab') === 'executives' ? 'executives' : 'companies'
  const [activeTab, setActiveTab] = useState<ManageWatchlistTab>(initialTab)

  const companiesState = useWatchlistCompanies(companies)
  const stakeholdersState = useWatchlistStakeholders(watchedStakeholders)

  function onTabChange(value: string) {
    const tab: ManageWatchlistTab = value === 'executives' ? 'executives' : 'companies'
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'executives') params.set('tab', 'executives')
    else params.delete('tab')
    const qs = params.toString()
    router.replace(
      qs ? `${ROUTES.marketSignalsManage}?${qs}` : ROUTES.marketSignalsManage,
      { scroll: false },
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <WatchlistManageHeader />

        <Tabs value={activeTab} onValueChange={onTabChange} className="gap-6">
          <WatchlistManageTabList activeTab={activeTab} onTabChange={onTabChange} />

          <TabsContent value="companies" className="mt-0">
            <WatchlistCompaniesPanel
              newsroomSummary={newsroomSummary}
              {...companiesState}
            />
          </TabsContent>

          <TabsContent value="executives" className="mt-0">
            <WatchlistExecutivesPanel {...stakeholdersState} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
