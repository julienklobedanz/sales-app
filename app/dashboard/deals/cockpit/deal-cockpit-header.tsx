'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { DealStatusBadge } from '@/components/deal-status-badge'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { formatDealVolume } from '@/lib/format'

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
  const owner = deal.sales_manager_name ?? deal.account_manager_name ?? null
  const volumeLabel =
    deal.volume && String(deal.volume).trim() ? formatDealVolume(deal.volume) : null

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
        <div className="min-w-0 space-y-1.5">
          <h1
            className={`${DASHBOARD_PAGE_TITLE_CLASS} flex flex-wrap items-center gap-x-2 break-words`}
          >
            <span>{deal.title}</span>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <DealStatusBadge status={deal.status} />
          </h1>
          {(deal.company_name || volumeLabel || owner) ? (
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {deal.company_id && deal.company_name ? (
              <Link
                href={accountsDetailHref(deal.company_id)}
                className="text-foreground hover:underline"
              >
                {deal.company_name}
              </Link>
            ) : deal.company_name ? (
              <span>{deal.company_name}</span>
            ) : null}
            {volumeLabel ? (
              <>
                <span aria-hidden>·</span>
                <span>{volumeLabel}</span>
              </>
            ) : null}
            {owner ? (
              <>
                <span aria-hidden>·</span>
                <span>{owner}</span>
              </>
            ) : null}
          </p>
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
