import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { DealBreadcrumbs } from '@/app/(app)/deals/cockpit/deal-breadcrumbs'
import { COPY } from '@/lib/copy'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import {
  formatDeadlineRowParts,
  formatNextDeadlineHeadline,
  pickNextDeadline,
} from '@/lib/deals/deadline-display'
import { formatDealVolume, type OrgDateDisplayFormat } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { tenderProcedureTypeLabel } from '@/lib/tenders/procedure-types'
import type { TenderPageData } from '@/lib/tenders/load-tender-page-data'
import { TenderStatusBadge } from '@/components/tender-status-badge'

export function TenderPageContent({
  tender,
  orgDateDisplayFormat,
}: {
  tender: TenderPageData
  orgDateDisplayFormat: OrgDateDisplayFormat
}) {
  const nextDeadline = pickNextDeadline(tender.deadlines)
  const restDeadlines = nextDeadline
    ? tender.deadlines.filter((row) => row.id !== nextDeadline.id)
    : tender.deadlines
  const procedureLabel = tenderProcedureTypeLabel(tender.procedure_type)
  const facts = [
    tender.company_name
      ? {
          label: COPY.tenders.customer,
          value: tender.company_name,
          companyId: tender.company_id,
        }
      : null,
    procedureLabel ? { label: COPY.tenders.procedureType, value: procedureLabel } : null,
    tender.reference_number
      ? { label: COPY.tenders.referenceNumber, value: tender.reference_number }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null)

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <DealBreadcrumbs
          items={[
            { label: COPY.tenders.breadcrumbRoot, href: ROUTES.deals.root },
            { label: tender.title },
          ]}
        />
        <div className="space-y-1.5">
          <h1
            className={`${DASHBOARD_PAGE_TITLE_CLASS} flex flex-wrap items-center gap-x-2 break-words`}
          >
            <span>{tender.title}</span>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <TenderStatusBadge status={tender.derivedStatus} />
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {tender.company_id && tender.company_name ? (
              <Link
                href={accountsDetailHref(tender.company_id)}
                className="text-foreground hover:underline"
              >
                {tender.company_name}
              </Link>
            ) : tender.company_name ? (
              <span>{tender.company_name}</span>
            ) : null}
            {procedureLabel ? (
              <>
                {tender.company_name ? <span aria-hidden>·</span> : null}
                <span>{procedureLabel}</span>
              </>
            ) : null}
            {tender.total_volume ? (
              <>
                {tender.company_name || procedureLabel ? (
                  <span aria-hidden>·</span>
                ) : null}
                <span aria-label={COPY.tenders.totalVolume}>
                  {formatDealVolume(tender.total_volume)}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {COPY.deals.cockpit.nextDeadlineLabel}
        </h2>
        {nextDeadline ? (
          <div className="space-y-2">
            {(() => {
              const headline = formatNextDeadlineHeadline(nextDeadline, {
                dateDisplayFormat: orgDateDisplayFormat,
              })
              return (
                <p className="text-base font-semibold">
                  {headline.title}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {headline.subtitle}
                  </span>
                </p>
              )
            })()}
            {restDeadlines.map((deadline) => {
              const parts = formatDeadlineRowParts(deadline, {
                dateDisplayFormat: orgDateDisplayFormat,
              })
              return (
                <p key={deadline.id} className="text-sm text-muted-foreground">
                  {parts.labelDate}
                  {parts.countdown ? ` · ${parts.countdown}` : ''}
                </p>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {COPY.tenders.nextDeadlineEmpty}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{COPY.tenders.lotsHeading}</h2>
        {tender.lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.lotsEmpty}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tender.lots.map((lot) => (
              <Card key={lot.id} className="p-0">
                <Link
                  href={ROUTES.deals.detail(lot.id)}
                  className="block h-full rounded-lg focus-visible:outline-none"
                >
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <p className="text-sm font-semibold">{lot.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDealVolume(lot.volume)}
                    </p>
                    <div className="mt-auto">
                      <DealStatusBadge status={lot.status} />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {facts.length > 0 ? (
        <section className="space-y-3">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="text-sm">
                  {'companyId' in fact && fact.companyId ? (
                    <Link
                      href={accountsDetailHref(fact.companyId)}
                      className="hover:underline"
                    >
                      {fact.value}
                    </Link>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  )
}
