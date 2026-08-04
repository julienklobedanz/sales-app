import type { CommandSearchResult } from '@/lib/command-center/global-search'
import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'

export type HomepageSearchGroups = {
  marketSignals: Extract<CommandSearchResult, { kind: 'market_signal' }>[]
  certificates: Extract<CommandSearchResult, { kind: 'certificate' }>[]
  documents: Array<
    Extract<CommandSearchResult, { kind: 'nda' } | { kind: 'reference_document' }>
  >
}

export type HomepageUniversalSearchResult =
  | {
      success: true
      query: string
      referenceHits: HomepageSemanticReferenceHit[]
      groups: HomepageSearchGroups
      semanticWarning?: string
    }
  | { success: false; query: string; error: string }

export function emptyHomepageSearchGroups(): HomepageSearchGroups {
  return {
    marketSignals: [],
    certificates: [],
    documents: [],
  }
}

export function hasAnyHomepageSearchHit(
  referenceHits: HomepageSemanticReferenceHit[],
  groups: HomepageSearchGroups,
): boolean {
  return (
    referenceHits.length > 0 ||
    groups.marketSignals.length > 0 ||
    groups.certificates.length > 0 ||
    groups.documents.length > 0
  )
}

export function countHomepageSearchHits(
  referenceHits: HomepageSemanticReferenceHit[],
  groups: HomepageSearchGroups,
): number {
  return (
    referenceHits.length +
    groups.marketSignals.length +
    groups.certificates.length +
    groups.documents.length
  )
}
