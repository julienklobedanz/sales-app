import Link from 'next/link'

import { DealBreadcrumbs } from '@/app/(app)/deals/cockpit/deal-breadcrumbs'
import { DealDeadlinesCard } from '@/app/(app)/deals/cockpit/deal-deadlines-card'
import { DealDocumentsSection } from '@/app/(app)/deals/cockpit/deal-documents-section'
import { DealProofIndicator } from '@/components/dashboard/deal-proof-indicator'
import { RoleAvatar } from '@/components/dashboard/role-avatar'
import { DealStatusBadge } from '@/components/deal-status-badge'
import { TenderStatusBadge } from '@/components/tender-status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { accountsDetailHref } from '@/lib/accounts/accounts-list-view'
import { COPY } from '@/lib/copy'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { proofDisplayFromCounts } from '@/lib/deals/deal-proof-display'
import { formatDealVolume, type OrgDateDisplayFormat } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import type { TenderPageData } from '@/lib/tenders/load-tender-page-data'
import { tenderProcedureTypeLabel } from '@/lib/tenders/procedure-types'
import { statusTone } from '@/lib/ui/status-tone'

export function TenderPageContent({
  tender,
  orgDateDisplayFormat,
  canManageDocuments = false,
}: {
  tender: TenderPageData
  orgDateDisplayFormat: OrgDateDisplayFormat
  canManageDocuments?: boolean
}) {
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

      <DealDeadlinesCard
        owner={{ kind: 'tender', id: tender.id, title: tender.title }}
        deadlines={tender.deadlines}
        orgDateDisplayFormat={orgDateDisplayFormat}
      />

      <DealDocumentsSection
        owner={{
          kind: 'tender',
          id: tender.id,
          title: tender.title,
          lots: tender.lots.map((lot) => ({ id: lot.id, title: lot.title })),
        }}
        documents={tender.documents}
        canManage={canManageDocuments}
        isRfpMode
        forceExpanded
      />

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
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <DealStatusBadge status={lot.status} />
                          {lot.bidDecision === 'go' ? (
                            <Badge variant="outline" className={statusTone.success}>
                              {COPY.tenders.bidGo}
                            </Badge>
                          ) : null}
                          {lot.bidDecision === 'no-bid' ? (
                            <Badge variant="outline" className={statusTone.danger}>
                              {COPY.tenders.bidNoBid}
                            </Badge>
                          ) : null}
                        </div>
                        {lot.account_manager_name || lot.sales_manager_name ? (
                          <div className="flex items-center gap-1.5">
                            <RoleAvatar
                              name={lot.account_manager_name}
                              avatarUrl={lot.account_manager_avatar_url}
                              role={COPY.roles.accountManager}
                            />
                            <RoleAvatar
                              name={lot.sales_manager_name}
                              avatarUrl={lot.sales_manager_avatar_url}
                              role={COPY.roles.salesManager}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex min-h-9 items-center">
                        {lot.bidDecision === 'no-bid' && lot.proofCount === 0 ? null : (
                          <DealProofIndicator
                            display={proofDisplayFromCounts(
                              lot.proofCount,
                              lot.proofBestScore,
                            )}
                            interactive={false}
                          />
                        )}
                      </div>
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
