export type EnrichCompanyResult =
  | {
      success: true
      company_id: string
      company_name: string
      website_url: string | null
      industry: string | null
      headquarters: string | null
      country: string | null
      employee_count: number | null
      logo_url: string | null
    }
  | { success: false; error: string }

/** Nur Abfrage – keine DB-Schreiboperation. Für Bearbeiten-Formular. */
export type FetchEnrichmentResult =
  | {
      success: true
      company_name: string
      website_url: string | null
      industry: string | null
      headquarters: string | null
      country: string | null
      employee_count: number | null
      logo_url: string | null
      description: string | null
    }
  | { success: false; error: string }

export type CompanySearchSuggestion = {
  id: string
  name: string
  logo_url?: string | null
  /** Quelle für die Anzeige in Autocomplete-Listen */
  source?: 'local' | 'brandfetch'
}

export type CompanySearchResult =
  | { success: true; suggestions: CompanySearchSuggestion[]; hint?: string }
  | { success: false; error: string }

export type CreateReferenceResult =
  | { success: true; referenceId: string }
  | { success: false; error: string }

export type ExternalContact = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone?: string | null
}
