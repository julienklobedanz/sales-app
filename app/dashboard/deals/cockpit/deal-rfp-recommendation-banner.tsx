import { cn } from '@/lib/utils'
import { COPY } from '@/lib/copy'
import { statusTone, statusToneFill, statusToneText } from '@/lib/ui/status-tone'
import {
  eligibilityVerdictLabel,
  eligibilityVerdictTone,
} from '@/lib/deals/compare-eligibility-criteria'
import { formatAngebotsReifeBreakdown } from '@/lib/deals/rfp-cockpit-metrics'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { winProbabilityTone } from '@/lib/deal-desk/win-probability'

import type { DealDocumentRow } from '../document-actions'
import { DealRfpAnalyzeButton } from './deal-rfp-analyze-button'

function toneStyles(tone: DealRfpCockpitData['recommendation']['tone']) {
  switch (tone) {
    case 'go':
      return {
        shell: statusTone.success,
        badge: statusToneFill.success,
        accent: 'bg-status-success',
      }
    case 'caution':
      return {
        shell: statusTone.warning,
        badge: statusToneFill.warning,
        accent: 'bg-status-warning',
      }
    case 'no-bid':
      return {
        shell: statusTone.danger,
        badge: statusToneFill.danger,
        accent: 'bg-status-danger',
      }
    default:
      return {
        shell: 'border-border bg-muted/40',
        badge: statusToneFill.muted,
        accent: 'bg-muted-foreground/60',
      }
  }
}

function shortLabel(label: string): string {
  const m = label.match(/Empfehlung:\s*(.+)/i)
  return (m?.[1] ?? label).trim()
}

function metricValueClass(tone: 'go' | 'caution' | 'no-bid' | 'muted'): string {
  if (tone === 'go') return statusToneText.success
  if (tone === 'caution') return statusToneText.warning
  if (tone === 'no-bid') return statusToneText.danger
  return 'text-foreground'
}

function CompactMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'go' | 'caution' | 'no-bid' | 'muted'
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'truncate text-sm font-semibold tabular-nums',
          metricValueClass(tone),
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function DealRfpRecommendationBanner({
  data,
  dealId,
  documents,
  canManage,
  showEngineMetrics = true,
}: {
  data: DealRfpCockpitData
  dealId: string
  documents: DealDocumentRow[]
  canManage: boolean
  showEngineMetrics?: boolean
}) {
  const { recommendation, analyzedAt, isStale, hasAnalysis } = data
  const showReanalyzeCta = isStale || !hasAnalysis
  const styles = toneStyles(recommendation.tone)
  const showMetrics = hasAnalysis && !isStale
  const analyzedLabel =
    analyzedAt && !isStale
      ? COPY.deals.cockpit.recommendationAnalyzedOn.replace(
          '{date}',
          new Date(analyzedAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
        )
      : null

  const reifeTone = showMetrics ? winProbabilityTone(data.winProbability) : 'muted'
  const reifeValue = showMetrics ? `${data.winProbability}%` : '—'

  const eligibilityAssessment = data.eligibilityAssessment
  const eligibilityValue =
    showMetrics && eligibilityAssessment
      ? eligibilityVerdictLabel(eligibilityAssessment.verdict)
      : '—'
  const eligibilityTone =
    showMetrics && eligibilityAssessment
      ? eligibilityVerdictTone(eligibilityAssessment.verdict)
      : 'muted'

  const icpRubrik = data.icpRubrik
  const icpValue =
    showMetrics && icpRubrik
      ? `${icpRubrik.score}/${icpRubrik.max}`
      : showMetrics && data.icpFitLabel
        ? data.icpFitLabel
        : '—'
  const icpTone: 'go' | 'caution' | 'muted' =
    icpRubrik && icpRubrik.score >= 4
      ? 'go'
      : icpRubrik && icpRubrik.score >= 2
        ? 'caution'
        : 'muted'

  const reifeHint =
    showMetrics && data.winProbabilityBreakdown
      ? formatAngebotsReifeBreakdown(data.winProbabilityBreakdown)
      : null

  const knockouts = (eligibilityAssessment?.criteria ?? []).filter(
    (row) => row.mandatory && row.status === 'not_met',
  )

  return (
    <div id="urteil" className="scroll-mt-24">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border shadow-sm',
          styles.shell,
        )}
      >
        <div className={cn('absolute inset-y-0 left-0 w-1', styles.accent)} aria-hidden />
        <div className="flex flex-col gap-3 px-4 py-3.5 pl-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                  styles.badge,
                )}
              >
                {shortLabel(recommendation.label)}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-sm leading-relaxed text-foreground">
                  {recommendation.detail}
                </p>
                {knockouts.length > 0 ? (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-foreground">
                      {knockouts.map((row) => (
                        <li key={row.id}>
                          <span className="font-medium">{row.label}</span>
                          {row.detail ? `: ${row.detail}` : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                {analyzedLabel ? (
                  <p className="text-xs text-muted-foreground">{analyzedLabel}</p>
                ) : null}
                {reifeHint ? (
                  <p className="text-xs text-muted-foreground">
                    {reifeHint} · Coverage {data.coveragePercent}%
                  </p>
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

          {showEngineMetrics ? (
            <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
              <CompactMetric
                label={COPY.deals.cockpit.metricAngebotsReife}
                value={reifeValue}
                tone={reifeTone}
              />
              <CompactMetric
                label={COPY.deals.cockpit.metricEligibility}
                value={eligibilityValue}
                tone={eligibilityTone}
              />
              <CompactMetric
                label={COPY.deals.cockpit.metricIcpFit}
                value={icpValue}
                tone={icpTone}
              />
            </div>
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
