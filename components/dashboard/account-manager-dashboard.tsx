'use client'

import Link from 'next/link'

import {
  DashboardFooterStrip,
  DashboardSectionCard,
  FunnelBarList,
  HonestEmpty,
  HorizontalBarList,
  StatusTonePill,
  WorkQueueRow,
} from '@/components/dashboard/dashboard-home-primitives'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AccountManagerDashboardModel } from '@/app/dashboard/dashboard-home-data'
import { COPY } from '@/lib/copy'
import { formatCopy } from '@/lib/dashboard-home/copy-format'
import { cn } from '@/lib/utils'

function riskPillClass(tone: 'gap' | 'warn' | 'ok') {
  return cn(
    'text-[11px]',
    tone === 'ok' && 'border-primary/30 bg-primary/10 text-primary',
    tone === 'warn' && 'border-amber-300/60 bg-amber-50 text-amber-900',
    tone === 'gap' && 'border-destructive/30 bg-destructive/10 text-destructive'
  )
}

export function AccountManagerDashboard({
  data,
  thin = false,
}: {
  data: AccountManagerDashboardModel
  thin?: boolean
}) {
  const c = COPY.dashboard.home.accountManager

  const footerItems = thin
    ? [
        { text: formatCopy(c.footerReferences, { n: 0 }) },
        { text: formatCopy(c.footerPending, { n: 0 }) },
        { text: formatCopy(c.footerAdvocate, { n: 0 }) },
      ]
    : [
        { text: formatCopy(c.footerReferences, { n: data.footerStats.referencesTotal }) },
        { text: formatCopy(c.footerPending, { n: data.footerStats.pendingApprovals }) },
        { text: formatCopy(c.footerAdvocate, { n: data.footerStats.advocateRequests }) },
      ]

  return (
    <>
      <DashboardSectionCard
        title={c.digestTitle}
        count={thin ? undefined : data.digest.length}
        description={c.digestDescription}
        hero
      >
        {thin || data.digest.length === 0 ? (
          <HonestEmpty title={c.digestEmptyTitle} description={c.digestEmptyDescription} />
        ) : (
          data.digest.map((item) => (
            <WorkQueueRow
              key={`${item.href}-${item.title}`}
              tone={item.tone === 'info' ? 'intent' : item.tone === 'intent' ? 'intent' : item.tone}
              title={item.title}
              meta={item.meta}
              ctaLabel={item.ctaLabel}
              href={item.href}
            />
          ))
        )}
      </DashboardSectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardSectionCard title={c.freshTitle} description={c.freshDescription}>
          {thin || data.freshness.length === 0 ? (
            <HonestEmpty title={c.freshEmptyTitle} description={c.freshEmptyDescription} />
          ) : (
            <div className="space-y-0">
              {data.freshness.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between gap-2 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0 text-sm">
                    <Link href={row.href} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.summary}</p>
                  </div>
                  <StatusTonePill tone={row.tone} />
                </div>
              ))}
            </div>
          )}
        </DashboardSectionCard>

        <DashboardSectionCard title={c.whitespotTitle} description={c.whitespotDescription}>
          {thin || data.whitespots.length === 0 ? (
            <HonestEmpty title={c.whitespotEmptyTitle} description={c.whitespotEmptyDescription} />
          ) : (
            <div className="space-y-0">
              {data.whitespots.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-2 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 flex-1 text-sm">{row.label}</span>
                  <Badge variant="outline" className={riskPillClass(row.tone)}>
                    {row.countLabel}
                  </Badge>
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                    <Link href={row.href}>{c.whitespotRequest}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DashboardSectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardSectionCard title={c.funnelTitle} description={c.funnelDescription}>
          {thin || data.approvalFunnel.every((s) => s.value === 0) ? (
            <HonestEmpty title={c.funnelEmptyTitle} description={c.funnelEmptyDescription} />
          ) : (
            <FunnelBarList steps={data.approvalFunnel} />
          )}
        </DashboardSectionCard>

        <DashboardSectionCard title={c.advocateTitle} description={c.advocateDescription}>
          {thin || data.advocateLoad.length === 0 ? (
            <HonestEmpty title={c.advocateEmptyTitle} description={c.advocateEmptyDescription} />
          ) : (
            <HorizontalBarList
              items={data.advocateLoad.map((row) => ({
                label: row.label,
                value: row.value,
                display: row.display,
              }))}
            />
          )}
        </DashboardSectionCard>
      </div>

      <DashboardFooterStrip label={c.footerLabel} items={footerItems} />
    </>
  )
}
