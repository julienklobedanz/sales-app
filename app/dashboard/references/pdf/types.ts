export type PdfTemplate = 'one_pager' | 'detail' | 'anonymized'

export type PdfReference = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: string
  tags: string | null
  company_name: string
  company_logo_url: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  customer_contact: string | null
  project_status: string | null
  project_start: string | null
  project_end: string | null
  duration_months: number | null
}

export type PdfOrgBranding = {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}
