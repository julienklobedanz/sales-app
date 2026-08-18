'use client'

import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealWorkspaceRiskEntry } from '@/lib/deals/deal-workspace-risk-entry'
import { cn } from '@/lib/utils'
import { statusTone } from '@/lib/ui/status-tone'

export function riskFlagSeverityBadge(severity: 'critical' | 'high' | 'medium'): {
  label: string
  className: string
} {
  switch (severity) {
    case 'critical':
      return {
        label: COPY.deals.cockpit.risksSeverityCritical,
        className: statusTone.danger,
      }
    case 'high':
      return {
        label: COPY.deals.cockpit.risksSeverityHigh,
        className: statusTone.warning,
      }
    default:
      return {
        label: COPY.deals.cockpit.risksSeverityMedium,
        className: statusTone.neutral,
      }
  }
}

export function evidenceGapBadgeClass(
  severity: 'missing' | 'partial' | 'info',
): string {
  if (severity === 'missing') return statusTone.danger
  if (severity === 'partial') return statusTone.warning
  return statusTone.neutral
}

export function evidenceGapBadgeLabel(
  severity: 'missing' | 'partial' | 'info',
): string {
  if (severity === 'missing') return 'Fehlt'
  if (severity === 'partial') return 'Teilweise'
  return 'Prüfen'
}

export function smeTopicBadgeClass(topic: string): string {
  const t = topic.toLowerCase()
  if (/legal|recht|vertrag/.test(t)) {
    return 'bg-primary/10 text-primary'
  }
  if (/security|sicherheit|compliance|iso/.test(t)) {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
  }
  if (/pricing|finance|preis|kosten/.test(t)) {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
}

export function DealRfpRisksSection({
  entries,
  visible,
}: {
  entries: DealWorkspaceRiskEntry[]
  visible: boolean
}) {
  const { hrefFor, selected } = useCollectionObjectSelection({
    items: entries,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  if (!visible) return null

  const flags = entries.filter((e) => e.kind === 'red-flag')
  const evidence = entries.filter((e) => e.kind === 'evidence')
  const sme = entries.filter((e) => e.kind === 'sme')

  return (
    <div id="risks" className="scroll-mt-24">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {`${COPY.deals.cockpit.risksTitle} · ${entries.length}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-0 xl:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksGeneralTitle}
              {flags.length > 0 ? ` · ${flags.length}` : ''}
            </p>
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksGeneralEmpty}
              </p>
            ) : (
              <ul className="space-y-0 divide-y divide-border/60">
                {flags.map((flag) => {
                  if (flag.kind !== 'red-flag') return null
                  const badge = riskFlagSeverityBadge(flag.severity)
                  const current = selected?.id === flag.id
                  return (
                    <li key={flag.id}>
                      <Link
                        href={hrefFor(flag.id)}
                        aria-current={current ? 'page' : undefined}
                        aria-label={COPY.deals.cockpit.risksOpenEntry}
                        className={cn(
                          'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                          current && 'bg-muted/20',
                        )}
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
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksRequestedEvidenceTitle}
              {evidence.length > 0 ? ` · ${evidence.length}` : ''}
            </p>
            {evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksRequestedEvidenceEmpty}
              </p>
            ) : (
              <ul className="space-y-0 divide-y divide-border/60">
                {evidence.map((gap) => {
                  if (gap.kind !== 'evidence') return null
                  const current = selected?.id === gap.id
                  return (
                    <li key={gap.id}>
                      <Link
                        href={hrefFor(gap.id)}
                        aria-current={current ? 'page' : undefined}
                        aria-label={COPY.deals.cockpit.risksOpenEntry}
                        className={cn(
                          'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                          current && 'bg-muted/20',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                            evidenceGapBadgeClass(gap.severity),
                          )}
                        >
                          {evidenceGapBadgeLabel(gap.severity)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{gap.title}</p>
                          {gap.detail ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {gap.detail}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-sm font-medium">
              {COPY.deals.cockpit.risksOpenPointsTitle}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {sme.length}
              </span>
            </p>
            {sme.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {COPY.deals.cockpit.risksOpenPointsEmpty}
              </p>
            ) : (
              <ul className="space-y-0 divide-y divide-border/60">
                {sme.map((item) => {
                  if (item.kind !== 'sme') return null
                  const current = selected?.id === item.id
                  return (
                    <li key={item.id}>
                      <Link
                        href={hrefFor(item.id)}
                        aria-current={current ? 'page' : undefined}
                        aria-label={COPY.deals.cockpit.risksOpenEntry}
                        className={cn(
                          'flex items-start gap-3 py-3 first:pt-0 last:pb-0',
                          current && 'bg-muted/20',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            smeTopicBadgeClass(item.topic),
                          )}
                        >
                          {item.topic}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{item.title}</p>
                          {item.contextExcerpt && item.contextExcerpt !== item.title ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.contextExcerpt}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
