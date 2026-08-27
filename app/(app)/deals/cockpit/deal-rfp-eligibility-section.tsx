'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
import type { EligibilityAssessment } from '@/lib/deals/eligibility-criteria-schema'
import type { RequirementLinkPickDoc } from '@/lib/deals/requirement-link-types'
import { cn } from '@/lib/utils'
import { statusTone, statusToneText } from '@/lib/ui/status-tone'

import {
  confirmDealEligibilityNoMatchingEvidence,
  linkDealEligibilityCriterionDocument,
} from './deal-eligibility-criterion-actions'
import { DealEvidenceLinkSheet } from './deal-evidence-link-sheet'

const EMPTY_PICK_DOCS: RequirementLinkPickDoc[] = []
const EMPTY_ABSENCE: Record<
  string,
  { confirmedAt: string; confirmedByName: string | null }
> = {}
const EMPTY_LINKED_DOCS: Record<string, string[]> = {}

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

function formatAbsenceLine(confirmedAt: string, confirmedByName: string | null): string {
  const date = new Date(confirmedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
  if (confirmedByName) {
    return COPY.deals.cockpit.eligibilityAbsenceConfirmed
      .replace('{date}', date)
      .replace('{name}', confirmedByName)
  }
  return COPY.deals.cockpit.eligibilityAbsenceConfirmedNoName.replace('{date}', date)
}

export function DealRfpEligibilitySection({
  dealId,
  canManage = false,
  pickDocs = EMPTY_PICK_DOCS,
  rowsPersisted = false,
  hasAnalysis,
  isStale,
  capabilityProfileEmpty,
  assessment,
  absenceByCriterionId = EMPTY_ABSENCE,
  linkedDocumentIdsByCriterionId = EMPTY_LINKED_DOCS,
}: {
  dealId: string
  canManage?: boolean
  pickDocs?: RequirementLinkPickDoc[]
  rowsPersisted?: boolean
  hasAnalysis: boolean
  isStale: boolean
  capabilityProfileEmpty: boolean
  assessment: EligibilityAssessment | null
  absenceByCriterionId?: Record<
    string,
    { confirmedAt: string; confirmedByName: string | null }
  >
  linkedDocumentIdsByCriterionId?: Record<string, string[]>
}) {
  const showSection = hasAnalysis && !isStale
  const router = useRouter()
  const [linkCriterionId, setLinkCriterionId] = useState<string | null>(null)
  const [pendingAbsenceId, setPendingAbsenceId] = useState<string | null>(null)

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
  const linkingRow = assessment.criteria.find((row) => row.id === linkCriterionId)
  const linkedDocumentIds = new Set(
    linkCriterionId ? (linkedDocumentIdsByCriterionId[linkCriterionId] ?? []) : [],
  )

  async function handleConfirmAbsence(criterionId: string) {
    setPendingAbsenceId(criterionId)
    try {
      const result = await confirmDealEligibilityNoMatchingEvidence({
        dealId,
        criterionId,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(COPY.deals.cockpit.eligibilityAbsenceSuccess)
      router.refresh()
    } finally {
      setPendingAbsenceId(null)
    }
  }

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
              {assessment.criteria.map((row) => {
                const absence = absenceByCriterionId[row.id]
                const showActions =
                  canManage && rowsPersisted && row.dimension === 'certification'
                return (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 font-medium">{row.label}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <p>
                        {row.detail}
                        {row.mandatory ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({COPY.deals.cockpit.eligibilityMandatory})
                          </span>
                        ) : null}
                      </p>
                      {absence && row.basis === 'confirmed' ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatAbsenceLine(
                            absence.confirmedAt,
                            absence.confirmedByName,
                          )}
                        </p>
                      ) : null}
                      {showActions ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setLinkCriterionId(row.id)}
                          >
                            {COPY.deals.cockpit.requirementsLinkEvidence}
                          </Button>
                          {row.basis !== 'confirmed' && row.basis !== 'linked' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={pendingAbsenceId != null}
                              onClick={() => void handleConfirmAbsence(row.id)}
                            >
                              {COPY.deals.cockpit.eligibilityNoMatchingEvidence}
                            </Button>
                          ) : null}
                        </div>
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
                )
              })}
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
          {capabilityProfileEmpty ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`${ROUTES.settings}?tab=workspace`}>
                {COPY.deals.cockpit.eligibilityProfileCta}
              </Link>
            </Button>
          ) : null}
        </Card>
      </CardContent>

      <DealEvidenceLinkSheet
        open={linkCriterionId != null}
        onOpenChange={(open) => {
          if (!open) setLinkCriterionId(null)
        }}
        title={COPY.deals.cockpit.requirementsLinkEvidence}
        description={linkingRow?.label ?? ''}
        need={linkingRow ? `${linkingRow.label} ${String(linkingRow.value)}` : ''}
        pickDocs={pickDocs}
        linkedDocumentIds={linkedDocumentIds}
        successMessage={COPY.deals.cockpit.requirementsLinkSuccess}
        onLink={async (documentId) => {
          if (!linkCriterionId) {
            return { success: false, error: 'Kein Kriterium gewählt.' }
          }
          const result = await linkDealEligibilityCriterionDocument({
            dealId,
            criterionId: linkCriterionId,
            documentId,
          })
          if (result.success) router.refresh()
          return result
        }}
      />
    </Card>
  )
}
