'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CompanyLogo } from '@/components/ui/company-logo'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import {
  ACCOUNT_LENS_SECTIONS,
  accountLensEditableControlIds,
  accountLensHasActionableSignal,
  accountLensLoads,
  accountLensSectionPresence,
} from '@/lib/accounts/account-lens'
import type { NdaDisplayStatus } from '@/lib/accounts/account-entity'
import { resolveNdaDisplayStatus } from '@/lib/accounts/account-entity'
import { formatDealCollectionDeadline } from '@/app/dashboard/deals/deals-table-format'
import { referenceStatusLabel } from './account-detail-constants'
import { AccountDetailNdaPopover } from './components/account-detail-nda-popover'
import type { CompanyCard } from './accounts-grid-types'
import type { AccountDealRow, CompanyRefRow } from './account-action-types'
import type { NdaAgreementRow } from './nda-actions'
import {
  MeetingPrepOverlayDialog,
  runCreateMeetingPrep,
  useMeetingPrepFlow,
} from '@/components/dashboard/meeting-prep-overlay'

export type AccountLensPayload = {
  references: CompanyRefRow[]
  activeDeals: AccountDealRow[]
  ndaAgreements: NdaAgreementRow[]
}

function ndaStatement(status: NdaDisplayStatus): string {
  if (status === 'active') return COPY.accounts.lens.ndaActive
  if (status === 'expiring') return COPY.accounts.lens.ndaExpiring
  return COPY.accounts.lens.ndaNone
}

function proofUsability(status: string, ndaGates: boolean): string {
  const shareable = status === 'approved' || status === 'anonymized'
  if (ndaGates && shareable) return COPY.accounts.lens.proofsLocked
  return referenceStatusLabel(status)
}

function AccountLensBriefingButton({ company }: { company: CompanyCard }) {
  const flow = useMeetingPrepFlow()
  const [pending, setPending] = useState(false)

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setPending(true)
          void runCreateMeetingPrep(company.name, company.id, flow).finally(() =>
            setPending(false),
          )
        }}
      >
        {pending ? COPY.accounts.lens.briefing.preparing : COPY.accounts.lens.briefingCta}
      </Button>
      <MeetingPrepOverlayDialog
        open={flow.overlayOpen}
        onOpenChange={flow.setOverlayOpen}
        title={flow.overlayTitle || company.name}
        snapshot={flow.snapshot}
      />
    </>
  )
}

export function AccountLensPane({
  company,
  payload,
  canManageNda,
  openNdaOnMount = false,
}: {
  company: CompanyCard | null
  payload: AccountLensPayload | null
  canManageNda: boolean
  openNdaOnMount?: boolean
}) {
  if (!company) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        {COPY.accounts.lens.emptyRead}
      </div>
    )
  }

  const references = payload?.references ?? []
  const deals = payload?.activeDeals ?? []
  const ndaAgreements = payload?.ndaAgreements ?? []
  const ndaStatus = resolveNdaDisplayStatus(ndaAgreements)
  const ndaGates = ndaStatus === 'active' || ndaStatus === 'expiring'
  const hasActionableSignal =
    accountLensLoads('actionableSignal') &&
    accountLensHasActionableSignal({
      hasOpenDeals: deals.length > 0 || (company.open_deals_count ?? 0) > 0,
      latestSignalSummary: company.latest_signal_summary,
    })
  const presence = accountLensSectionPresence({
    hasDeals: deals.length > 0,
    hasActionableSignal,
  })

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-6 p-5">
        {accountLensEditableControlIds().map((id) => (
          <div key={id} data-lens-control={id} />
        ))}
        {ACCOUNT_LENS_SECTIONS.map((section) => {
          if (presence[section] === 'omitted') return null

          if (section === 'identity') {
            return (
              <header
                key={section}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CompanyLogo
                    src={company.logo_url}
                    companyId={company.id}
                    fallbackText={company.name}
                    containerClassName="size-12 shrink-0 rounded-xl"
                    fallbackIconSize={22}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{company.name}</h2>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {[
                        company.industry
                          ? formatIndustryDisplay(company.industry)
                          : null,
                        company.headquarters,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                </div>
                <AccountLensBriefingButton company={company} />
              </header>
            )
          }

          if (section === 'state') {
            return (
              <section key={section} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed">{ndaStatement(ndaStatus)}</p>
                  <AccountDetailNdaPopover
                    companyId={company.id}
                    companyName={company.name}
                    initialAgreements={ndaAgreements}
                    canManage={canManageNda}
                    openOnMount={openNdaOnMount}
                  />
                </div>
              </section>
            )
          }

          if (section === 'proofs') {
            return (
              <section key={section} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {COPY.accounts.lens.proofsHeading}
                </h3>
                {references.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {COPY.accounts.lens.proofsEmpty}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {references.map((ref) => (
                      <li
                        key={ref.id}
                        className="rounded-lg border border-border/70 px-3 py-2"
                      >
                        <Link
                          href={ROUTES.references.detail(ref.id)}
                          className="text-sm font-medium hover:underline"
                        >
                          {ref.title}
                        </Link>
                        <p className="mt-1 text-sm text-foreground/90">
                          {ref.summary?.trim() || '—'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ref.project_year ?? '—'}
                          {' · '}
                          {proofUsability(ref.status, ndaGates)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          }

          if (section === 'deals') {
            return (
              <section key={section} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {COPY.accounts.lens.dealsHeading}
                </h3>
                <ul className="space-y-2">
                  {deals.map((deal) => (
                    <li key={deal.id} className="text-sm">
                      <Link
                        href={ROUTES.deals.detail(deal.id)}
                        className="font-medium hover:underline"
                      >
                        {deal.title}
                      </Link>
                      {deal.expiry_date ? (
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatDealCollectionDeadline(deal.expiry_date)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            )
          }

          return (
            <section key={section} className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {COPY.accounts.lens.signalHeading}
              </h3>
              <p className="text-sm">{company.latest_signal_summary}</p>
            </section>
          )
        })}
      </div>
    </ScrollArea>
  )
}
