import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/deal-analysis-types'

export type DealDeskSuitabilityCriteria = {
  bidderRequirements: string[]
  roleQualifications: string[]
  specialConditions: string[]
}

export function resolveDomainTags(
  briefing: DealDeskExecutiveBriefingFields | null | undefined,
): string[] {
  return briefing?.domainTags?.length ? [...briefing.domainTags] : []
}

export function resolveProjectLocation(
  briefing: DealDeskExecutiveBriefingFields | null | undefined,
): string {
  const loc = briefing?.projectLocation?.trim()
  return loc || '—'
}

export function resolveSuitabilityCriteria(
  briefing: DealDeskExecutiveBriefingFields | null | undefined,
): DealDeskSuitabilityCriteria {
  return {
    bidderRequirements: briefing?.bidderRequirements ?? [],
    roleQualifications: briefing?.roleQualifications ?? [],
    specialConditions: briefing?.specialConditions ?? [],
  }
}

export function hasSuitabilityContent(criteria: DealDeskSuitabilityCriteria): boolean {
  return (
    criteria.bidderRequirements.length > 0 ||
    criteria.roleQualifications.length > 0 ||
    criteria.specialConditions.length > 0
  )
}

export function resolveBidEnrichment(
  analysis: Pick<DealDeskMockAnalysis, 'executiveBriefing'>,
) {
  const briefing = analysis.executiveBriefing
  return {
    domainTags: resolveDomainTags(briefing),
    projectLocation: resolveProjectLocation(briefing),
    suitability: resolveSuitabilityCriteria(briefing),
  }
}
