export type ExtractedReferenceData = {
  title: string | null
  summary: string | null
  industry: string | null
  volume_eur: string | null
  employee_count: number | null
  tags: string[]
  company_name: string | null
  customer_challenge: string | null
  our_solution: string | null
}

export type ExtractDataFromDocumentResult =
  | { success: true; data: ExtractedReferenceData }
  | { success: false; error: string }

