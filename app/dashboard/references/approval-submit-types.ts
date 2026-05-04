/** Optionen für `submitForApproval` (eigenes Modul ohne "use server", für Client-Typ-Imports). */
export type SubmitForApprovalOptions = {
  /** Empfänger aus contact_persons */
  contactId?: string
  /** Empfänger aus external_contacts (Kundenkontakt) */
  externalContactId?: string
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
