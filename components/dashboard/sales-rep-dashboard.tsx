'use client'

import Link from 'next/link'

import {
  CoverageDonut,
  DashboardFooterStrip,
  DashboardSectionCard,
  HonestEmpty,
  HorizontalBarList,
  SignalStatusPill,
  WorkQueueRow,
} from '@/components/dashboard/dashboard-home-primitives'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import { buildSalesRepQueue } from '@/lib/dashboard-home/build-sales-rep-queue'
import type { SalesRepDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { ROUTES } from '@/lib/routes'

function signalToneFromGap(meddpiccGap: string): 'ok' | 'warn' | 'gap' {
  const g = meddpiccGap.toLowerCase()
  if (g.includes('economic buyer') || g.includes('champion fehlt')) return 'gap'
  if (g.includes('fehlt') || g.includes('ziele')) return 'warn'
  return 'ok'
}

function aggregateShareBars(
  recentShares: SalesRepDashboardModel['recentShares'],
  fallbackTitle: string,
) {
  const counts = new Map<string, number>()
  for (const row of recentShares) {
    const label = row.reference_title?.trim() || fallbackTitle
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      value,
      display: value === 1 ? '1' : `${value}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

export function SalesRepDashboard({
  data,
  thin = false,
}: {
  data: SalesRepDashboardModel
  thin?: boolean
}) {
  const c = COPY.dashboard.home.salesRep
  const queue = buildSalesRepQueue(data)
  const shareBars = aggregateShareBars(data.recentShares, c.reuseFallbackTitle)
  const { footerStats } = data
  const coveragePct =
    footerStats.dealsTotal > 0
      ? Math.round((footerStats.dealsWithProof / footerStats.dealsTotal) * 100)
      : 0

  const footerItems = thin
    ? [
        { text: c.footerThinMatches },
        { text: c.footerThinShared },
        { text: c.footerThinDeals },
      ]
    : [
        { text: formatCopy(c.footerMatches, { n: footerStats.matches7d }) },
        { text: formatCopy(c.footerShared, { n: footerStats.shares7d }) },
        {
          text:
            footerStats.dealsTotal > 0
              ? formatCopy(c.footerDealsProof, {
                  withProof: footerStats.dealsWithProof,
                  total: footerStats.dealsTotal,
                })
              : c.footerNoDeals,
        },
      ]

  const sortedDeals = [...data.activeDeals].sort((a, b) => {
    const da = a.expiry_date ? new Date(`${a.expiry_date}T12:00:00`).getTime() : Infinity
    const db = b.expiry_date ? new Date(`${b.expiry_date}T12:00:00`).getTime() : Infinity
    return da - db
  })

  return (
    <>
      <DashboardSectionCard
        title={c.queueTitle}
        count={thin ? undefined : queue.length}
        description={c.queueDescription}
        hero
      >
        {thin || queue.length === 0 ? (
          <HonestEmpty title={c.queueEmptyTitle} description={c.queueEmptyDescription} />
        ) : (
          queue.map((item) => (
            <WorkQueueRow
              key={item.id}
              tone={item.tone}
              title={item.title}
              meta={item.meta}
              ctaLabel={item.ctaLabel}
              href={item.href}
            />
          ))
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title={c.signalsTitle}
        count={thin ? undefined : data.strategicAccounts.length}
        description={c.signalsDescription}
      >
        {thin || data.strategicAccounts.length === 0 ? (
          <HonestEmpty
            title={c.signalsEmptyTitle}
            description={c.signalsEmptyDescription}
          />
        ) : (
          <div className="space-y-0">
            {data.strategicAccounts.map((signal) => {
              const tone = signalToneFromGap(signal.meddpiccGap)
              return (
                <div
                  key={signal.companyId}
                  className="flex items-start gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <SignalStatusPill tone={tone} />
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{signal.companyName}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      — {signal.signalSummary}
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                  >
                    <Link href={signal.href}>{signal.actionLabel}</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </DashboardSectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardSectionCard title={c.coverageTitle} description={c.coverageDescription}>
          {thin || data.activeDeals.length === 0 ? (
            <HonestEmpty
              title={c.coverageEmptyTitle}
              description={c.coverageEmptyDescription}
            />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <CoverageDonut
                percent={coveragePct}
                label={`${footerStats.dealsWithProof}/${footerStats.dealsTotal}`}
                sublabel={c.coverageDonutSublabel}
              />
              <div className="min-w-0 flex-1 space-y-0">
                {sortedDeals.map((deal) => {
                  const hasProof = deal.linkedCount > 0
                  const deadline = deal.expiry_date
                    ? new Date(`${deal.expiry_date}T12:00:00`).toLocaleDateString(
                        'de-DE',
                        {
                          day: 'numeric',
                          month: 'short',
                        },
                      )
                    : null
                  return (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between gap-2 border-t border-border py-2 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0 text-sm">
                        <Link
                          href={ROUTES.deals.detail(deal.id)}
                          className="font-medium hover:underline"
                        >
                          {deal.company_name ?? deal.title}
                        </Link>
                        {deadline ? (
                          <p className="text-xs text-muted-foreground">
                            {c.coverageUntil} {deadline}
                          </p>
                        ) : null}
                      </div>
                      {hasProof ? (
                        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          {c.coverageProofOk}
                        </span>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <Link href={ROUTES.matchWithDeal(deal.id)}>
                            {c.queueFindProof}
                          </Link>
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard title={c.reuseTitle} description={c.reuseDescription}>
          {thin || shareBars.length === 0 ? (
            <HonestEmpty
              title={c.reuseEmptyTitle}
              description={c.reuseEmptyDescription}
            />
          ) : (
            <HorizontalBarList items={shareBars} />
          )}
        </DashboardSectionCard>
      </div>

      <DashboardFooterStrip label={c.footerLabel} items={footerItems} />
    </>
  )
}
