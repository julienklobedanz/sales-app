import { cn } from '@/lib/utils'
import { COPY } from '@/lib/copy'

import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'

import type { DealDocumentRow } from '../document-actions'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

function toneStyles(tone: DealRfpCockpitData['recommendation']['tone']) {
  switch (tone) {
    case 'go':
      return {
        shell: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40',
        badge: 'bg-emerald-600 text-white',
        accent: 'bg-emerald-600',
      }
    case 'caution':
      return {
        shell: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40',
        badge: 'bg-amber-500 text-white',
        accent: 'bg-amber-500',
      }
    case 'no-bid':
      return {
        shell: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40',
        badge: 'bg-red-600 text-white',
        accent: 'bg-red-600',
      }
    default:
      return {
        shell: 'border-border bg-muted/40',
        badge: 'bg-muted-foreground/80 text-white',
        accent: 'bg-muted-foreground/60',
      }
  }
}

function shortLabel(label: string): string {
  const m = label.match(/Empfehlung:\s*(.+)/i)
  return (m?.[1] ?? label).trim()
}

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
  const styles = toneStyles(recommendation.tone)
  const analyzedLabel =
    analyzedAt && !isStale
      ? COPY.deals.cockpit.recommendationAnalyzedOn.replace(
          '{date}',
          new Date(analyzedAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        )
      : null

  return (
    <div>
      <div className={cn('relative overflow-hidden rounded-xl border shadow-sm', styles.shell)}>
        <div className={cn('absolute inset-y-0 left-0 w-1', styles.accent)} aria-hidden />
        <div className="flex flex-col gap-3 px-4 py-3.5 pl-5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className={cn(
                'mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                styles.badge
              )}
            >
              {shortLabel(recommendation.label)}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-relaxed text-foreground">{recommendation.detail}</p>
              {analyzedLabel ? (
                <p className="text-xs text-muted-foreground">{analyzedLabel}</p>
              ) : null}
            </div>
          </div>

          {showReanalyzeCta ? (
            <DealRfpAnalyzeButton
              dealId={dealId}
              documents={documents}
              canManage={canManage}
              hasAnalysis={hasAnalysis}
              isStale={isStale}
              className="sm:ml-auto sm:shrink-0"
            />
          ) : null}
        </div>
      </div>
      {isStale ? (
        <p className="mt-1.5 text-right text-xs font-medium text-muted-foreground">
          {COPY.deals.cockpit.rfpReanalyzeHint}
        </p>
      ) : null}
    </div>
  )
}
