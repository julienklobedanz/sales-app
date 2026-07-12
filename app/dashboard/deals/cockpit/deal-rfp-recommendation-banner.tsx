import { cn } from '@/lib/utils'
import { COPY } from '@/lib/copy'

import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import type { DealDocumentRow } from '../document-actions'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

export function DealRfpRecommendationBanner({
  data,
  dealId,
  documents,
  canManage,
}: {
  data: DealRfpCockpitData
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
}) {
  const { recommendation, analyzedAt, isStale, hasAnalysis } = data
  const showReanalyzeCta = isStale || !hasAnalysis
  const toneClass =
    recommendation.tone === 'go'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100'
      : recommendation.tone === 'caution'
        ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100'
        : recommendation.tone === 'no-bid'
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
          : 'border-border bg-muted/40 text-muted-foreground'

  return (
    <div className="mb-4">
      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3',
          toneClass
        )}
      >
        <span className="shrink-0 font-semibold">{recommendation.label}</span>
        <span className="min-w-0 flex-1">{recommendation.detail}</span>
        {analyzedAt && !isStale ? (
          <span className="text-xs opacity-80 sm:ml-auto">
            Analyse vom{' '}
            {new Date(analyzedAt).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        ) : showReanalyzeCta ? (
          <DealRfpAnalyzeButton
            dealId={dealId}
            documents={documents}
            canManage={canManage}
            hasAnalysis={hasAnalysis}
            isStale={isStale}
            className="sm:ml-auto"
          />
        ) : null}
      </div>
      {isStale ? (
        <p className="mt-1 text-right text-xs font-medium text-muted-foreground">
          {COPY.deals.cockpit.rfpReanalyzeHint}
        </p>
      ) : null}
    </div>
  )
}
