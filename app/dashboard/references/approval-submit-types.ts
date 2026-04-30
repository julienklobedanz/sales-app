/** Optionen für `submitForApproval` (eigenes Modul ohne "use server", für Client-Typ-Imports). */
export type SubmitForApprovalOptions = {
  contactId?: string
  message?: string
  ownerName?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
  competitorBlacklist?: string[]
  proposedQuote?: string
  approvalExpiresInDays?: number
  scope?: {
    namedMention: boolean
    anonymousMention: boolean
    referenceCall: boolean
    logoUse: boolean
    pressRelease: boolean
  }
}
