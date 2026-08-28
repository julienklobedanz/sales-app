'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { RoleAvatar } from '@/components/dashboard/role-avatar'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { formatDealVolume } from '@/lib/format'
import { dealWorkspaceLandingHref } from '@/lib/deals/deal-workspace-href'

import type { DealWithReferences } from '../types'
import { DealBreadcrumbs } from './deal-breadcrumbs'
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
  const volumeLabel =
    deal.volume && String(deal.volume).trim() ? formatDealVolume(deal.volume) : null
  const showWorkspace = deal.is_rfp_mode

  return (
    <div className="mb-6 space-y-3">
      <DealBreadcrumbs
        items={
          deal.tender_id && deal.tender
            ? [
                { label: COPY.tenders.breadcrumbRoot, href: ROUTES.deals.root },
                {
                  label: deal.tender.title,
                  href: ROUTES.tenders.detail(deal.tender.id),
                },
                { label: deal.title },
              ]
            : [
                { label: COPY.nav.deals, href: ROUTES.deals.root },
                { label: deal.title },
              ]
        }
      />

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
          {deal.company_name || volumeLabel ? (
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
            </p>
          ) : null}
          {deal.account_manager_name || deal.sales_manager_name ? (
            <div className="flex items-center gap-1.5">
              <RoleAvatar
                name={deal.account_manager_name}
                avatarUrl={deal.account_manager_avatar_url ?? null}
                role={COPY.roles.accountManager}
              />
              <RoleAvatar
                name={deal.sales_manager_name}
                avatarUrl={deal.sales_manager_avatar_url ?? null}
                role={COPY.roles.salesManager}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showWorkspace ? (
            <Button type="button" size="sm" asChild>
              <Link href={dealWorkspaceLandingHref(deal.id)}>
                {COPY.deals.cockpit.openWorkspace}
              </Link>
            </Button>
          ) : null}
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
