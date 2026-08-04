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
  /** Projektlaufzeit in Monaten (kein DB-Feld — wird über Start/Ende abgebildet). */
  duration_months: number | null
  /** ISO-Datum YYYY-MM-DD oder null. */
  project_start: string | null
  /** ISO-Datum YYYY-MM-DD oder null. */
  project_end: string | null
  incumbent_provider: string | null
  /** Komma-getrennte Wettbewerber (optional mit Preis/Hinweis in Klammern). */
  competitors: string | null
  contract_type: string | null
}

export type ExtractDataFromDocumentResult =
  | { success: true; data: ExtractedReferenceData }
  | { success: false; error: string }
