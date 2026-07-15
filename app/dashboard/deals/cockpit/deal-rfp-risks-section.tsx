import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function DealRfpRisksSection({ data }: { data: DealRfpCockpitData }) {
  const showSection = data.hasAnalysis && !data.isStale
  const risks = data.risks

  if (!showSection || !risks) return null

  const { redFlags, smeGroups, smeOpenCount } = risks

  return (
    <Card id="risks" className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{COPY.deals.cockpit.risksTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {COPY.deals.cockpit.risksRedFlagsTitle.replace('{count}', String(redFlags.length))}
          </p>
          {redFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.risksRedFlagsEmpty}</p>
          ) : (
            <ul className="space-y-0 divide-y divide-border/60">
              {redFlags.map((flag) => {
                const badge = severityBadge(flag.severity)
                return (
                  <li key={flag.id} className="flex items-start gap-3 py-3 first:pt-0">
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{flag.title}</p>
                      {flag.excerpt ? (
                        <p className="mt-1 text-xs text-muted-foreground">{flag.excerpt}</p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {COPY.deals.cockpit.risksSmeTitle.replace('{count}', String(smeOpenCount))}
          </p>
          {smeGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.risksSmeEmpty}</p>
          ) : (
            <div className="space-y-3">
              {smeGroups.map((group) => (
                <div
                  key={group.topic}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {group.topic}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length}{' '}
                      {group.items.length === 1
                        ? COPY.deals.cockpit.risksSmePointSingular
                        : COPY.deals.cockpit.risksSmePointPlural}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="border-t border-dashed border-border/50 pt-1.5 text-sm text-foreground first:border-t-0 first:pt-0"
                      >
                        {item.question}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
