import type { BackfillSignalEnrichmentResult } from '@/lib/market-signals/backfill-signal-enrichment'

export type DecisionMakerCandidate = {
  id: string
  fullName: string
  title: string
  roleBucket: 'cio' | 'it_lead' | 'infrastructure' | 'security' | 'data' | 'other'
  confidence: number
  confidenceReason: string
  source: 'the_org' | 'cio_de' | 'linkedin'
  sourceLabel: string
  profileUrl: string | null
  lastSeenAt: string | null
  mutualConnections: number | null
  /** Lesbare Warm-Intro-Brücken (z. B. Kollege X kennt Stakeholder Y). */
  mutualConnectionBridges: string[]
}

export type WatchlistCompanyResult = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
  accountStatus: string | null
}

export type TriggerMarketSignalsIngestResult =
  | {
      success: true
      refreshFeeds: boolean
      purge?: {
        accountNewsDeleted: number
        executiveDeleted: number
      }
      news: {
        companiesScanned: number
        articlesInserted: number
        leadershipMovesInserted: number
        errors: string[]
      }
      executives: {
        peopleScanned: number
        signalsInserted: number
        skippedNoCompany: number
        errors: string[]
      }
    }
  | { success: false; error: string }

export type BackfillMarketSignalEnrichmentResult =
  | ({ success: true } & BackfillSignalEnrichmentResult)
  | { success: false; error: string }

export type BackfillCompanyNewsroomsResult =
  | {
      success: true
      scanned: number
      withUrls: number
      skipped: number
      errors: string[]
    }
  | { success: false; error: string }

export type SignalReferenceMatchPayload = {
  key: string
  query: string
  /** Account des Signals — gleiche Firma aus Matches ausfiltern (Proof von anderen Cases). */
  excludeCompanyId?: string | null
}
