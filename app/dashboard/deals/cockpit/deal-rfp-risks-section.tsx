'use client'

import { useState } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { cn } from '@/lib/utils'

function severityBadge(severity: DealDeskRedFlag['severity']): {
  label: string
  className: string
} {
  switch (severity) {
    case 'critical':
      return {
        label: COPY.deals.cockpit.risksSeverityCritical,
        className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      }
    case 'high':
      return {
        label: COPY.deals.cockpit.risksSeverityHigh,
        className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
      }
    default:
      return {
        label: COPY.deals.cockpit.risksSeverityMedium,
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      }
  }
}

function topicBadgeClass(topic: string): string {
  const t = topic.toLowerCase()
  if (/legal|recht|vertrag/.test(t)) {
    return 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
  }
  if (/security|sicherheit|compliance|iso/.test(t)) {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
  }
  if (/pricing|finance|preis|kosten/.test(t)) {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
}

/** Risks + open SME points — collapsed by default. */
export function DealRfpRisksSection({ data }: { data: DealRfpCockpitData }) {
  const showSection = data.hasAnalysis && !data.isStale
  const risks = data.risks
  const [expanded, setExpanded] = useState(false)

  if (!showSection || !risks) return null

  const { redFlags, smeGroups, smeOpenCount } = risks
  const evidenceGaps = data.requestedEvidenceGaps ?? []
  const openItems = smeGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      topic: group.topic,
    })),
  )
  const totalCount = redFlags.length + smeOpenCount + evidenceGaps.length

  return (
    <div id="risks" className="scroll-mt-24">
      <Card className="shadow-sm">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="flex w-full items-center gap-2 text-left">
                <AppIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform',
                    expanded && 'rotate-90',
                  )}
                />
                <CardTitle className="text-base">
                  {`${COPY.deals.cockpit.risksTitle} · ${totalCount}`}
                </CardTitle>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 gap-4 pt-0 xl:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="mb-2 text-sm font-medium">
                  {COPY.deals.cockpit.risksGeneralTitle}
                  {redFlags.length > 0 ? ` · ${redFlags.length}` : ''}
                </p>
                {redFlags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {COPY.deals.cockpit.risksGeneralEmpty}
                  </p>
                ) : (
                  <ul className="space-y-0 divide-y divide-border/60">
                    {redFlags.map((flag) => {
                      const badge = severityBadge(flag.severity)
                      return (
                        <li
                          key={flag.id}
                          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <span
                            className={cn(
                              'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                              badge.className,
                            )}
                          >
                            {badge.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{flag.title}</p>
                            {flag.excerpt ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {flag.excerpt}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <p className="mb-2 text-sm font-medium">
                  {COPY.deals.cockpit.risksRequestedEvidenceTitle}
                  {evidenceGaps.length > 0 ? ` · ${evidenceGaps.length}` : ''}
                </p>
                {evidenceGaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {COPY.deals.cockpit.risksRequestedEvidenceEmpty}
                  </p>
                ) : (
                  <ul className="space-y-0 divide-y divide-border/60">
                    {evidenceGaps.map((gap) => (
                      <li
                        key={gap.id}
                        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                            gap.severity === 'missing'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                              : gap.severity === 'partial'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                          )}
                        >
                          {gap.severity === 'missing'
                            ? 'Fehlt'
                            : gap.severity === 'partial'
                              ? 'Teilweise'
                              : 'Prüfen'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{gap.label}</p>
                          {gap.detail ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {gap.detail}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <p className="mb-2 text-sm font-medium">
                  {COPY.deals.cockpit.risksOpenPointsTitle}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    · {smeOpenCount}
                  </span>
                </p>
                {openItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {COPY.deals.cockpit.risksOpenPointsEmpty}
                  </p>
                ) : (
                  <ul className="space-y-0 divide-y divide-border/60">
                    {openItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            topicBadgeClass(item.topic),
                          )}
                        >
                          {item.topic}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">
                            {item.question}
                          </p>
                          {item.contextExcerpt &&
                          item.contextExcerpt !== item.question ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.contextExcerpt}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
