'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
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
  const knockouts = (assessment?.criteria ?? []).filter(
    (row) => row.mandatory && row.status === 'not_met',
  )
  const [expanded, setExpanded] = useState(knockouts.length > 0)

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
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-start gap-2 text-left">
              <AppIcon
                icon={ArrowRight01Icon}
                size={16}
                className={cn(
                  'mt-0.5 shrink-0 text-muted-foreground transition-transform',
                  expanded && 'rotate-90',
                )}
              />
              <CardTitle className="text-base">{title}</CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="overflow-x-auto pl-6">
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

            <div
              className={cn(
                'ml-6 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
                verdictBannerClass(tone),
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
                  <Link href={`${ROUTES.settings}?tab=workspace`}>
                    {COPY.deals.cockpit.eligibilityProfileCta}
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
