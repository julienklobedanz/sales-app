import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import {
  eligibilityVerdictLabel,
  eligibilityVerdictTone,
  formatCriterionStatusLabel,
} from '@/lib/deals/compare-eligibility-criteria'
import type { DealRfpCockpitData } from '@/lib/deals/load-deal-rfp-cockpit-data'
import { cn } from '@/lib/utils'

function verdictBannerClass(tone: ReturnType<typeof eligibilityVerdictTone>): string {
  switch (tone) {
    case 'go':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
    case 'no-bid':
      return 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
    case 'caution':
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200'
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'met':
      return 'text-emerald-700 dark:text-emerald-300'
    case 'not_met':
      return 'text-red-700 dark:text-red-300'
    case 'partial':
      return 'text-amber-700 dark:text-amber-300'
    default:
      return 'text-amber-600 dark:text-amber-400'
  }
}

export function DealRfpEligibilitySection({ data }: { data: DealRfpCockpitData }) {
  const assessment = data.eligibilityAssessment
  const showSection = data.hasAnalysis && !data.isStale

  if (!showSection) return null

  if (!assessment || assessment.criteria.length === 0) {
    return (
      <Card id="eligCard" className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{COPY.deals.cockpit.eligibilityTitle}</CardTitle>
          <CardDescription>{COPY.deals.cockpit.eligibilityEmpty}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const tone = eligibilityVerdictTone(assessment.verdict)
  const label = eligibilityVerdictLabel(assessment.verdict)

  return (
    <Card id="eligCard" className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{COPY.deals.cockpit.eligibilityTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-semibold">{COPY.deals.cockpit.eligibilityColCriterion}</th>
                <th className="pb-2 pr-4 font-semibold">{COPY.deals.cockpit.eligibilityColRequirement}</th>
                <th className="pb-2 font-semibold">{COPY.deals.cockpit.eligibilityColStatus}</th>
              </tr>
            </thead>
            <tbody>
              {assessment.criteria.map((row) => (
                <tr key={row.id} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4 font-medium">{row.label}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.detail}
                    {row.mandatory ? (
                      <span className="ml-1 text-xs text-muted-foreground">({COPY.deals.cockpit.eligibilityMandatory})</span>
                    ) : null}
                  </td>
                  <td className={cn('py-3 whitespace-nowrap font-semibold', statusClass(row.status))}>
                    {formatCriterionStatusLabel(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
            verdictBannerClass(tone)
          )}
        >
          <div>
            <p className="font-semibold">
              {COPY.deals.cockpit.eligibilityVerdict}: {label}
            </p>
            <p className="mt-1 text-sm opacity-90">{assessment.summary}</p>
          </div>
          {data.capabilityProfileEmpty ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`${ROUTES.settings}?tab=workspace`}>{COPY.deals.cockpit.eligibilityProfileCta}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
