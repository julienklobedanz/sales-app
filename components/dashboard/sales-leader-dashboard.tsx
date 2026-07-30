'use client'

import Link from 'next/link'

import {
  DashboardFooterStrip,
  DashboardSectionCard,
  HonestEmpty,
  SignalStatusPill,
  WinRateCompareBars,
} from '@/components/dashboard/dashboard-home-primitives'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CompanyLogo } from '@/components/ui/company-logo'
import type { AdminDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { LeaderCallQueueSection } from '@/components/dashboard/leader-call-queue-section'
import { SalesLeaderMeetingPrepSection } from '@/components/dashboard/sales-leader-meeting-prep-section'
import { COPY } from '@/lib/copy'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import { cn } from '@/lib/utils'

function riskPillLabel(tone: 'gap' | 'warn' | 'ok') {
  const h = COPY.dashboard.home
  return tone === 'ok' ? h.signalPillChance : tone === 'warn' ? h.signalPillRisk : h.signalPillCritical
}

function riskPillClass(tone: 'gap' | 'warn' | 'ok') {
  return cn(
    'text-[11px]',
    tone === 'ok' && 'border-primary/30 bg-primary/10 text-primary',
    tone === 'warn' && 'border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
    tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive'
  )
}

function RiskDealRow({
  deal,
}: {
  deal: AdminDashboardModel['riskDeals'][number]
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
      <CompanyLogo
        src={deal.companyLogoUrl}
        companyId={deal.companyId}
        fallbackText={deal.companyName}
        containerClassName="size-9 shrink-0 rounded-md"
        fallbackIconSize={18}
      />
      <div className="min-w-0 flex-1 text-sm">
        <Link href={deal.href} className="font-medium hover:underline">
          {deal.title}
        </Link>
        <p className="text-xs text-muted-foreground">{deal.subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline" className={riskPillClass(deal.tone)}>
          {riskPillLabel(deal.tone)}
        </Badge>
        {deal.ctaLabel ? (
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link href={deal.href}>{deal.ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function SalesLeaderDashboard({
  data,
  thin = false,
}: {
  data: AdminDashboardModel
  thin?: boolean
}) {
  const c = COPY.dashboard.home.salesLeader
  const riskCount = data.riskDeals.filter((d) => d.tone !== 'ok').length

  const footerItems = thin
    ? [
        { text: formatCopy(c.footerReferences, { n: 0 }) },
        { text: formatCopy(c.footerActiveUsers, { n: 0 }) },
        { text: formatCopy(c.footerShareRate, { n: 0 }) },
      ]
    : [
        { text: formatCopy(c.footerReferences, { n: data.footerStats.referencesTotal }) },
        { text: formatCopy(c.footerActiveUsers, { n: data.footerStats.activeUsers }) },
        {
          text: formatCopy(c.footerShareRate, {
            n: data.footerStats.shareRatePercent ?? 0,
          }),
        },
      ]

  const win = data.winRateCompare
  const delta =
    win.available && win.withReferencePercent != null && win.withoutReferencePercent != null
      ? win.withReferencePercent - win.withoutReferencePercent
      : null

  return (
    <>
      <DashboardSectionCard
        title={c.riskTitle}
        count={thin ? undefined : riskCount}
        description={c.riskDescription}
        hero
      >
        {thin || data.riskDeals.length === 0 ? (
          <HonestEmpty title={c.riskEmptyTitle} description={c.riskEmptyDescription} />
        ) : (
          <div className="space-y-0">
            {data.riskDeals.map((deal) => (
              <RiskDealRow key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </DashboardSectionCard>

      <LeaderCallQueueSection rows={data.callQueue ?? []} thin={thin} />

      <div className="grid gap-4 md:grid-cols-2">
        <SalesLeaderMeetingPrepSection sessions={data.meetingPrepSessions ?? []} thin={thin} />

        <DashboardSectionCard title={c.covPipeTitle} description={c.covPipeDescription}>
          {thin || data.coveragePipeline.length === 0 ? (
            <HonestEmpty title={c.covPipeEmptyTitle} description={c.covPipeEmptyDescription} />
          ) : (
            <div className="space-y-0">
              {data.coveragePipeline.map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-2 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <div className="text-sm">
                    <span>{row.label}</span>
                    <p className="text-xs text-muted-foreground">{row.sublabel}</p>
                  </div>
                  <SignalStatusPill tone={row.tone === 'ok' ? 'ok' : row.tone === 'warn' ? 'warn' : 'gap'} />
                </div>
              ))}
            </div>
          )}
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard title={c.signalRiskTitle} description={c.signalRiskDescription}>
        {thin || data.signalRisks.length === 0 ? (
          <HonestEmpty title={c.signalRiskEmptyTitle} description={c.signalRiskEmptyDescription} />
        ) : (
          <div className="space-y-0">
            {data.signalRisks.map((row, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 border-t border-border py-2.5 first:border-t-0 first:pt-0"
              >
                <SignalStatusPill tone={row.tone === 'gap' ? 'gap' : 'warn'} />
                <span className="min-w-0 flex-1 text-sm">{row.text}</span>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={row.href}>{row.ctaLabel}</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title={
          <span className="inline-flex items-center gap-2">
            {c.winTitle}
            <Badge variant="secondary" className="text-[10px] uppercase">
              {COPY.dashboard.home.periodicQuarter}
            </Badge>
          </span>
        }
        description={c.winDescription}
      >
        {!win.available || win.withReferencePercent == null || win.withoutReferencePercent == null ? (
          <HonestEmpty
            title={c.winEmptyTitle}
            description={formatCopy(c.winEmptyDescription, {
              closed: win.closedDealsCount,
              min: win.minDealsRequired,
            })}
          />
        ) : (
          <div>
            <WinRateCompareBars
              withPercent={win.withReferencePercent}
              withoutPercent={win.withoutReferencePercent}
              withLabel={c.winWithRef}
              withoutLabel={c.winWithoutRef}
            />
            {delta != null && delta > 0 ? (
              <p className="mt-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                {formatCopy(c.winDelta, { n: delta })}
              </p>
            ) : null}
          </div>
        )}
      </DashboardSectionCard>

      <DashboardFooterStrip label={c.footerLabel} items={footerItems} />
    </>
  )
}
