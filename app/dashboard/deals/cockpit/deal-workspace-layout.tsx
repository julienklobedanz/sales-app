import Link from 'next/link'

import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'
import type { AusschreibungNavItem } from '@/lib/deals/build-ausschreibung-nav-items'
import { DealRfpHashBridge } from './deal-rfp-hash-bridge'
import { DealWorkspaceRail } from './deal-workspace-rail'

export function DealWorkspaceLayout({
  dealId,
  dealTitle,
  items,
  currentArea,
  children,
}: {
  dealId: string
  dealTitle: string
  items: AusschreibungNavItem[]
  currentArea: DealWorkspaceArea
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-1">
      <DealRfpHashBridge
        dealId={dealId}
        isRfpDeal
        surface="workspace"
        currentArea={currentArea}
      />
      <DealWorkspaceRail items={items} currentArea={currentArea} />
      <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7">
        <nav className="mb-6 text-sm text-muted-foreground">
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
        {children}
      </div>
    </div>
  )
}
