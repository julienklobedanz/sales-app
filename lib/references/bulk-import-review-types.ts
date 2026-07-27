/** Geteilte Typen für Bulk-Import-Review (Client + Server, ohne "use server"). */

export type BulkImportReviewSuggestions = {
  title?: string[]
  summary?: string[]
  industry?: string[]
  volume_eur?: string[]
  customer_challenge?: string[]
  our_solution?: string[]
  incumbent_provider?: string[]
  competitors?: string[]
}

export type BulkImportExtractionResult =
  | {
      success: true
      referenceId: string
      title: string
      needsInput: boolean
      extractionOk: boolean
      extractionError?: string
      suggestions: BulkImportReviewSuggestions
    }
  | { success: false; error: string }
