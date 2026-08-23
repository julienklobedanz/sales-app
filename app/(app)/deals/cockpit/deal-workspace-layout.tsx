'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import {
  DEAL_WORKSPACE_ENTRY_PARAM,
  dealWorkspaceLayoutChrome,
  dealWorkspaceSplitVisibility,
  isDealWorkspaceEntryArea,
  resolveDealWorkspaceView,
  shouldStripDealWorkspaceEntryQuery,
  type DealWorkspaceArea,
} from '@/lib/deals/deal-workspace-areas'
import type { AusschreibungNavItem } from '@/lib/deals/build-ausschreibung-nav-items'
import {
  buildCollectionObjectUrl,
  useCollectionObjectSelection,
} from '@/lib/dashboard/use-collection-object-selection'
import { AppIcon } from '@/lib/icons'
import { useIsMobile } from '@/hooks/use-mobile'
import { DealRfpHashBridge } from './deal-rfp-hash-bridge'
import { DealWorkspaceRail } from './deal-workspace-rail'

export function DealWorkspaceLayout({
  dealId,
  dealTitle,
  items,
  currentArea,
  entries = [],
  panel,
  children,
}: {
  dealId: string
  dealTitle: string
  items: AusschreibungNavItem[]
  currentArea: DealWorkspaceArea
  entries?: readonly { id: string }[]
  panel?: ReactNode
  children: ReactNode
}) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isEntryArea = isDealWorkspaceEntryArea(currentArea)
  const entryItems = isEntryArea ? entries : []
  const { selected, clearSelection } = useCollectionObjectSelection({
    items: entryItems,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })
  const selectedId = searchParams.get(DEAL_WORKSPACE_ENTRY_PARAM)

  useEffect(() => {
    if (
      !shouldStripDealWorkspaceEntryQuery({
        area: currentArea,
        selectedId,
        entryCount: entryItems.length,
      })
    ) {
      return
    }
    router.replace(
      buildCollectionObjectUrl(pathname, searchParams, {
        [DEAL_WORKSPACE_ENTRY_PARAM]: null,
      }),
    )
  }, [currentArea, selectedId, entryItems.length, router, pathname, searchParams])

  const view = resolveDealWorkspaceView(currentArea, selected?.id ?? null)
  const chrome = dealWorkspaceLayoutChrome(view)
  const { showList, showPanel } = dealWorkspaceSplitVisibility({
    isMobile,
    layer: chrome.layer,
  })

  return (
    <div className="flex h-full min-h-0 flex-1">
      <DealRfpHashBridge
        dealId={dealId}
        isRfpDeal
        surface="workspace"
        currentArea={currentArea}
      />
      <DealWorkspaceRail items={items} currentArea={currentArea} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <nav className="shrink-0 px-5 pt-5 text-sm text-muted-foreground md:px-8 md:pt-7">
          <Link href={ROUTES.deals.root} className="hover:underline">
            Deals
          </Link>
          <span className="px-2">/</span>
          <Link href={ROUTES.deals.detail(dealId)} className="hover:underline">
            {dealTitle}
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{COPY.deals.cockpit.rfpBlockTitle}</span>
        </nav>
        <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} px-5 pt-2 md:px-8`}>
          {dealTitle}
        </h1>
        {showPanel ? (
          <div className="flex min-h-0 flex-1">
            {showList ? (
              <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7">
                {children}
              </div>
            ) : null}
            <div
              className={
                showList
                  ? 'flex min-w-0 flex-1 flex-col overflow-y-auto border-l border-border px-5 py-5 md:px-8 md:py-7'
                  : 'flex min-w-0 flex-1 flex-col overflow-y-auto px-5 py-5 md:px-8 md:py-7'
              }
            >
              {isMobile ? (
                <div className="mb-3 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2"
                    onClick={clearSelection}
                  >
                    <AppIcon icon={ArrowLeftIcon} size={16} />
                    {COPY.deals.cockpit.entryPanelBackToList}
                  </Button>
                </div>
              ) : null}
              <div className="min-h-0 flex-1">{panel}</div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
