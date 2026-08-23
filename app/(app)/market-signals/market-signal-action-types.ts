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
