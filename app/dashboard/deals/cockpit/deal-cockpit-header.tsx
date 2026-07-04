'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { DealStatusBadge } from '@/components/deal-status-badge'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { formatDealVolume } from '@/lib/format'
import { formatIndustryDisplay } from '@/lib/constants/industries'

import type { DealWithReferences } from '../types'
import { DealCockpitActions } from './deal-cockpit-actions'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitHeader({
  deal,
  companies,
  orgProfiles,
  briefingButton,
  canManageDocuments,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  briefingButton?: ReactNode
  canManageDocuments: boolean
}) {
  const owner = deal.sales_manager_name ?? deal.account_manager_name ?? '—'
  const subtitleParts = [
    deal.industry ? formatIndustryDisplay(deal.industry) : null,
    deal.company_name,
    formatDealVolume(deal.volume),
    owner !== '—' ? `Owner: ${owner}` : null,
  ].filter(Boolean)

  return (
    <div className="mb-6 space-y-3">
      <nav className="text-sm text-muted-foreground">
        <Link href={ROUTES.deals.root} className="hover:underline">
          Deals
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">{deal.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} flex flex-wrap items-center gap-2 break-words`}>
            <span>{deal.title}</span>
            <DealStatusBadge status={deal.status} />
          </h1>
          {subtitleParts.length ? (
            <p className="text-sm text-muted-foreground">{subtitleParts.join(' · ')}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {briefingButton}
          <DealCockpitActions
            deal={deal}
            companies={companies}
            orgProfiles={orgProfiles}
            canManage={canManageDocuments}
          />
        </div>
      </div>
    </div>
  )
}
