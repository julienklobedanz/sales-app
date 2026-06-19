import type { ReferenceFormCompany } from '@/app/dashboard/evidence/new/reference-form-fields'

export type { ReferenceFormCompany }

export type ContactPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

/** Für Dropdown Kundenansprechpartner (externer Kontakt mit optionaler Rolle). */
export type ExternalContactDisplay = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role?: string | null
  company_id?: string
  phone?: string | null
}

export type ReferenceFormStatus = 'draft' | 'internal_only' | 'approved' | 'anonymized'

export type ReferenceFormInitialData = {
  id: string
  company_id: string
  company_name: string
  company_logo_url?: string | null
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  website?: string | null
  employee_count?: number | null
  volume_eur?: string | null
  contract_type?: string | null
  incumbent_provider?: string | null
  competitors?: string | null
  customer_challenge?: string | null
  our_solution?: string | null
  customer_contact?: string | null
  customer_contact_id?: string | null
  contact_id?: string | null
  status: ReferenceFormStatus
  file_path?: string | null
  tags?: string | null
  project_status?: 'active' | 'completed' | null
  project_start?: string | null
  project_end?: string | null
  is_nda_deal?: boolean
}

export type ReferenceFormCompanyOption = ReferenceFormCompany

