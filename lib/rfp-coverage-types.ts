export const RFP_COVER_THRESHOLD = 0.55

export type RfpCoverageMatch = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  companyName: string | null
}

export type RfpCoverageRow = {
  requirementId: string
  requirementText: string
  category?: string
  matches: RfpCoverageMatch[]
  embedError?: string
}
