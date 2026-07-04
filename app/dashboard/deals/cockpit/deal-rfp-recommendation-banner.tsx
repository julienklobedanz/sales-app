import { cn } from '@/lib/utils'

import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

export function DealRfpRecommendationBanner({ data }: { data: DealRfpCockpitData }) {
  const { recommendation, analyzedAt, isStale } = data
  const toneClass =
    recommendation.tone === 'go'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100'
      : recommendation.tone === 'caution'
        ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100'
        : recommendation.tone === 'no-bid'
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
          : 'border-border bg-muted/40 text-muted-foreground'

  return (
    <div className={cn('mb-4 flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3', toneClass)}>
      <span className="font-semibold shrink-0">{recommendation.label}</span>
      <span>{recommendation.detail}</span>
      {analyzedAt && !isStale ? (
        <span className="sm:ml-auto text-xs opacity-80">
          Analyse vom{' '}
          {new Date(analyzedAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ) : analyzedAt && isStale ? (
        <span className="sm:ml-auto text-xs font-medium">Neu analysieren empfohlen</span>
      ) : null}
    </div>
  )
}
