import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { statusTone, statusToneText } from '@/lib/ui/status-tone'

function verdictBannerClass(tone: ReturnType<typeof eligibilityVerdictTone>): string {
  switch (tone) {
    case 'go':
      return statusTone.success
    case 'no-bid':
      return statusTone.danger
    case 'caution':
      return statusTone.warning
    default:
      return statusTone.neutral
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'met':
      return statusToneText.success
    case 'not_met':
      return statusToneText.danger
    case 'partial':
      return statusToneText.warning
    default:
      return statusToneText.muted
  }
}

export function DealRfpEligibilitySection({ data }: { data: DealRfpCockpitData }) {
  const assessment = data.eligibilityAssessment
  const showSection = data.hasAnalysis && !data.isStale

  if (!showSection) return null

  if (!assessment || assessment.criteria.length === 0) {
    return (
      <Card id="eligCard" className="scroll-mt-24 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {COPY.deals.cockpit.eligibilityTitle}
          </CardTitle>
          <CardDescription>{COPY.deals.cockpit.eligibilityEmpty}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const tone = eligibilityVerdictTone(assessment.verdict)
  const label = eligibilityVerdictLabel(assessment.verdict)
  const title = `${COPY.deals.cockpit.eligibilityTitle} · ${assessment.criteria.length}`

  return (
    <Card id="eligCard" className="scroll-mt-24 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-semibold">
                  {COPY.deals.cockpit.eligibilityColCriterion}
                </th>
                <th className="pb-2 pr-4 font-semibold">
                  {COPY.deals.cockpit.eligibilityColRequirement}
                </th>
                <th className="pb-2 font-semibold">
                  {COPY.deals.cockpit.eligibilityColStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {assessment.criteria.map((row) => (
                <tr key={row.id} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4 font-medium">{row.label}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.detail}
                    {row.mandatory ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({COPY.deals.cockpit.eligibilityMandatory})
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      'py-3 whitespace-nowrap font-semibold',
                      statusClass(row.status),
                    )}
                  >
                    {formatCriterionStatusLabel(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Card
          className={cn(
            'flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
            verdictBannerClass(tone),
          )}
        >
          <div>
            <CardTitle as="h3" className="text-sm font-semibold">
              {COPY.deals.cockpit.eligibilityVerdict}: {label}
            </CardTitle>
            <p className="mt-1 text-sm opacity-90">{assessment.summary}</p>
          </div>
          {data.capabilityProfileEmpty ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`${ROUTES.settings}?tab=workspace`}>
                {COPY.deals.cockpit.eligibilityProfileCta}
              </Link>
            </Button>
          ) : null}
        </Card>
      </CardContent>
    </Card>
  )
}
