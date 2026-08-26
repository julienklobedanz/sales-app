import { COPY } from '@/lib/copy'
import { eligibilityQueue } from '@/lib/deals/compare-eligibility-criteria'
import type { EligibilityAssessment } from '@/lib/deals/eligibility-criteria-schema'
import type { DealWorkspaceArea } from '@/lib/deals/deal-workspace-areas'
import { dealWorkspaceAreaHref } from '@/lib/deals/deal-workspace-href'
import { countDraftQueue } from '@/lib/deals/sort-draft-rows-by-criticality'

const TILE_AREAS = [
  'dokumente',
  'anforderungen',
  'eignung',
  'risiken',
  'entwuerfe',
] as const satisfies readonly DealWorkspaceArea[]

export type DealWorkspaceTile = {
  area: (typeof TILE_AREAS)[number]
  href: string
  label: string
  purpose: string
  /** `null` = keine Zustandszeile (Risiken nach Analyse: Rest unbekannt). */
  state: string | null
}

function countPhrase(singular: string, plural: string, count: number): string {
  return (count === 1 ? singular : plural).replace('{count}', String(count))
}

function formatDraftState(
  rows: Array<{ reference?: unknown; answer?: string | null }>,
): string {
  const { gap, draft } = countDraftQueue(rows)
  if (gap === 0 && draft === 0) {
    return countPhrase(
      COPY.deals.cockpit.workspaceTileDraftsOpenSingular,
      COPY.deals.cockpit.workspaceTileDraftsOpenPlural,
      0,
    )
  }
  const parts: string[] = []
  if (gap > 0) {
    parts.push(COPY.deals.cockpit.workspaceTileDraftsGap.replace('{count}', String(gap)))
  }
  if (draft > 0) {
    parts.push(
      COPY.deals.cockpit.workspaceTileDraftsText.replace('{count}', String(draft)),
    )
  }
  return parts.join(' · ')
}

function formatEligibilityState(assessment: EligibilityAssessment): string {
  const queue = eligibilityQueue(assessment.verdict, assessment.criteria)
  if (queue.kind === 'ko') {
    return countPhrase(
      COPY.deals.cockpit.workspaceTileEligibilityKoSingular,
      COPY.deals.cockpit.workspaceTileEligibilityKoPlural,
      queue.count,
    )
  }
  const { withoutProfile, unrecognized } = queue
  if (withoutProfile === 0 && unrecognized === 0) {
    return countPhrase(
      COPY.deals.cockpit.workspaceTileEligibilityUnclearSingular,
      COPY.deals.cockpit.workspaceTileEligibilityUnclearPlural,
      0,
    )
  }
  const parts: string[] = []
  if (withoutProfile > 0) {
    parts.push(
      countPhrase(
        COPY.deals.cockpit.workspaceTileEligibilityUnknownSingular,
        COPY.deals.cockpit.workspaceTileEligibilityUnknownPlural,
        withoutProfile,
      ),
    )
  }
  if (unrecognized > 0) {
    parts.push(
      countPhrase(
        COPY.deals.cockpit.workspaceTileEligibilityUnrecognizedSingular,
        COPY.deals.cockpit.workspaceTileEligibilityUnrecognizedPlural,
        unrecognized,
      ),
    )
  }
  return parts.join(' · ')
}

const PURPOSE: Record<(typeof TILE_AREAS)[number], string> = {
  dokumente: COPY.deals.cockpit.workspaceTilePurposeDokumente,
  anforderungen: COPY.deals.cockpit.workspaceTilePurposeAnforderungen,
  eignung: COPY.deals.cockpit.workspaceTilePurposeEignung,
  risiken: COPY.deals.cockpit.workspaceTilePurposeRisiken,
  entwuerfe: COPY.deals.cockpit.workspaceTilePurposeEntwuerfe,
}

const LABEL: Record<(typeof TILE_AREAS)[number], string> = {
  dokumente: COPY.deals.cockpit.ausschreibungNavDokumente,
  anforderungen: COPY.deals.cockpit.ausschreibungNavAnforderungen,
  eignung: COPY.deals.cockpit.ausschreibungNavEignung,
  risiken: COPY.deals.cockpit.ausschreibungNavRisiken,
  entwuerfe: COPY.deals.cockpit.ausschreibungNavDrafts,
}

export function buildDealWorkspaceTiles(input: {
  dealId: string
  documentCount: number
  data: {
    hasAnalysis: boolean
    isStale: boolean
    eligibilityAssessment: EligibilityAssessment | null
    draftRows: Array<{ reference?: unknown; answer?: string | null }>
    requirementsCount: number
  } | null
}): DealWorkspaceTile[] {
  const hasAnalysis = Boolean(input.data?.hasAnalysis && !input.data.isStale)
  const notAnalyzed = COPY.deals.cockpit.workspaceTileNotAnalyzed

  return TILE_AREAS.map((area) => {
    let state: string | null = notAnalyzed
    if (hasAnalysis && input.data) {
      switch (area) {
        case 'dokumente':
          state = countPhrase(
            COPY.deals.cockpit.workspaceTileDocumentsSingular,
            COPY.deals.cockpit.workspaceTileDocumentsPlural,
            input.documentCount,
          )
          break
        case 'anforderungen':
          state = countPhrase(
            COPY.deals.cockpit.workspaceTileRequirementsSingular,
            COPY.deals.cockpit.workspaceTileRequirementsPlural,
            input.data.requirementsCount,
          )
          break
        case 'eignung':
          state = input.data.eligibilityAssessment
            ? formatEligibilityState(input.data.eligibilityAssessment)
            : notAnalyzed
          break
        case 'risiken':
          state = null
          break
        case 'entwuerfe':
          state = formatDraftState(input.data.draftRows)
          break
      }
    }

    return {
      area,
      href: dealWorkspaceAreaHref(input.dealId, area),
      label: LABEL[area],
      purpose: PURPOSE[area],
      state,
    }
  })
}
