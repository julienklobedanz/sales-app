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

export function DealRfpRisksSection({ data }: { data: DealRfpCockpitData }) {
  const showSection = data.hasAnalysis && !data.isStale
  const risks = data.risks

  if (!showSection || !risks) return null

  const { redFlags, smeGroups, smeOpenCount } = risks
  const openItems = smeGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      topic: group.topic,
    }))
  )

  return (
    <div id="risks" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {COPY.deals.cockpit.risksGeneralTitle}
            <span className="ml-2 text-sm font-normal text-muted-foreground">· {redFlags.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {redFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.risksGeneralEmpty}</p>
          ) : (
            <ul className="space-y-0 divide-y divide-border/60">
              {redFlags.map((flag) => {
                const badge = severityBadge(flag.severity)
                return (
                  <li key={flag.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
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
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {COPY.deals.cockpit.risksOpenPointsTitle}
            <span className="ml-2 text-sm font-normal text-muted-foreground">· {smeOpenCount}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.deals.cockpit.risksOpenPointsEmpty}</p>
          ) : (
            <ul className="space-y-0 divide-y divide-border/60">
              {openItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      topicBadgeClass(item.topic)
                    )}
                  >
                    {item.topic}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.question}</p>
                    {item.contextExcerpt && item.contextExcerpt !== item.question ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.contextExcerpt}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
