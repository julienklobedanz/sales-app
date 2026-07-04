import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { COPY } from '@/lib/copy'
import { formatAngebotsReifeBreakdown } from '@/lib/deals/rfp-cockpit-metrics'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { cn } from '@/lib/utils'
import { winProbabilityTone } from '@/lib/deal-desk/win-probability'

function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: 'go' | 'caution' | 'no-bid' | 'muted'
}) {
  const valueClass =
    tone === 'go'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'caution'
        ? 'text-amber-700 dark:text-amber-300'
        : tone === 'no-bid'
          ? 'text-red-700 dark:text-red-300'
          : 'text-foreground'

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <div className={cn('text-2xl font-bold tabular-nums tracking-tight', valueClass)}>{value}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export function DealRfpMetricsRow({ data }: { data: DealRfpCockpitData }) {
  const showMetrics = data.hasAnalysis && !data.isStale

  const reifeTone = showMetrics ? winProbabilityTone(data.winProbability) : 'muted'
  const reifeValue = showMetrics ? `${data.winProbability}%` : '—'
  const reifeSub = showMetrics
    ? `${formatAngebotsReifeBreakdown(data.winProbabilityBreakdown)} · Coverage ${data.coveragePercent}%`
    : COPY.deals.cockpit.metricsStaleHint

  const icpValue = showMetrics && data.icpFitLabel ? data.icpFitLabel : '—'
  const icpSub =
    showMetrics && data.icpSummary
      ? data.icpSummary.slice(0, 120) + (data.icpSummary.length > 120 ? '…' : '')
      : COPY.deals.cockpit.icpPlaceholder

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MetricTile
        label={COPY.deals.cockpit.metricAngebotsReife}
        value={reifeValue}
        sub={reifeSub}
        tone={reifeTone}
      />
      <MetricTile
        label={COPY.deals.cockpit.metricEligibility}
        value={COPY.deals.cockpit.metricEligibilityPlaceholder}
        sub={COPY.deals.cockpit.metricEligibilityHint}
        tone="muted"
      />
      <MetricTile
        label={COPY.deals.cockpit.metricIcpFit}
        value={icpValue}
        sub={icpSub}
        tone="muted"
      />
    </div>
  )
}
