export function splitTags(tags: string | null) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export type CompanyRow = {
  id: string
  name: string
  headquarters?: string | null
  website_url?: string | null
  employee_count?: number | null
}

export type ReferenceDetailRow = {
  id: string
  title: string
  industry: string | null
  country: string | null
  status: string
  contact_id: string | null
  customer_contact_id: string | null
  customer_approval_status: string | null
  approval_owner_name: string | null
  approval_requester_name: string | null
  approval_coordinator_email: string | null
  approval_coordinator_name: string | null
  approval_customer_facing_name: string | null
  approval_requested_at: string | null
  approval_expires_at: string | null
  approval_scope_named_mention: boolean | null
  approval_scope_anonymous_mention: boolean | null
  approval_scope_reference_call: boolean | null
  approval_scope_logo_use: boolean | null
  approval_scope_confidential_sales: boolean | null
  approval_reference_call_frequency: string | null
  approval_grace_until: string | null
  approval_internal_status: string | null
  approval_contact_id: string | null
  approval_external_contact_id: string | null
  approval_reference_giver_name: string | null
  approval_reference_giver_title: string | null
  approval_delegated_to_name: string | null
  approval_delegated_to_email: string | null
  approval_competitor_blacklist: string[] | null
  approval_quote_proposed: string | null
  approval_quote_approved: string | null
  approval_comment: string | null
  approval_consent_file_url: string | null
  anonymized_from_id: string | null
  created_at: string | null
  updated_at: string | null
  tags: string | null
  customer_challenge: string | null
  our_solution: string | null
  customer_contact: string | null
  volume_eur: string | null
  contract_type: string | null
  project_start: string | null
  project_end: string | null
  project_status: string | null
  employee_count: number | null
  is_nda_deal: boolean | null
  file_path: string | null
  incumbent_provider: string | null
  competitors: string | null
  website: string | null
  companies: CompanyRow | CompanyRow[] | null
}
