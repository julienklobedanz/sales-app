'use client'

import type { ReactNode } from 'react'

import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import type { SubmissionWorkspaceOwner } from '@/lib/deals/submission-workspace-href'

import { DealBreadcrumbs } from './deal-breadcrumbs'
import {
  SubmissionWorkspaceRail,
  type SubmissionRailItem,
} from './submission-workspace-rail'

export function SubmissionWorkspaceLayout({
  owner,
  ownerTitle,
  items,
  currentId,
  children,
}: {
  owner: SubmissionWorkspaceOwner
  ownerTitle: string
  items: SubmissionRailItem[]
  currentId: string | null
  children: ReactNode
}) {
  const title =
    owner.kind === 'tender'
      ? COPY.tenders.submissionWorkspaceTitle
      : COPY.deals.cockpit.submissionWorkspaceTitle
  const crumbs =
    owner.kind === 'tender'
      ? [
          { label: COPY.tenders.breadcrumbRoot, href: ROUTES.deals.root },
          { label: ownerTitle, href: ROUTES.tenders.detail(owner.id) },
          { label: title },
        ]
      : [
          { label: COPY.nav.deals, href: ROUTES.deals.root },
          { label: ownerTitle, href: ROUTES.deals.detail(owner.id) },
          { label: title },
        ]

  return (
    <div className="flex h-full min-h-0 flex-1">
      <SubmissionWorkspaceRail items={items} currentId={currentId} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <nav className="shrink-0 px-5 pt-5 md:px-8 md:pt-7">
          <DealBreadcrumbs items={crumbs} />
        </nav>
        <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} px-5 pt-2 md:px-8`}>{title}</h1>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7">
          {children}
        </div>
      </div>
    </div>
  )
}
