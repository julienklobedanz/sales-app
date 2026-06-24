import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  companiesTag,
  complianceTag,
  kpisTag,
  referencesTag,
} from '@/lib/cache/tags'
import type { ComplianceDocumentRow } from '@/app/dashboard/settings/compliance-actions'
import type { ReferenceKpiCounts } from '@/lib/dashboard-home/dashboard-home-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const COMPLIANCE_SELECT =
  'id,organization_id,document_type,title,valid_until,file_storage_path,file_name,is_current,uploaded_by,created_at,updated_at'

const REFERENCE_ROWS_SELECT = `
      id,
      title,
      summary,
      industry,
      country,
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
      status,
      customer_approval_status,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      created_at,
      updated_at,
      company_id,
      contact_id,
      customer_contact_id,
      customer_contact,
      file_path,
      tags,
      project_status,
      project_start,
      project_end,
      is_nda_deal,
      companies ( name, logo_url ),
      contact_persons!references_contact_id_fkey ( email, first_name, last_name )
    `

const REFERENCE_ROWS_SELECT_NO_CONTACT = `
    id, title, summary, industry, country, website, employee_count,
    volume_eur, contract_type, incumbent_provider, competitors,
    customer_challenge, our_solution, status, customer_approval_status,
    approval_scope_named_mention, approval_scope_anonymous_mention,
    created_at, updated_at,
    company_id, contact_id, customer_contact_id, customer_contact, file_path, tags,
    project_status, project_start, project_end,
    is_nda_deal,
    companies ( name, logo_url )
  `

const REFERENCE_ROWS_SELECT_MINIMAL = `
    id, title, summary, industry, country, website, employee_count,
    volume_eur, contract_type, incumbent_provider, competitors,
    customer_challenge, our_solution, status, customer_approval_status,
    approval_scope_named_mention, approval_scope_anonymous_mention,
    created_at, updated_at,
    company_id, contact_id, file_path, tags,
    project_status, project_start, project_end,
    companies ( name, logo_url )
  `

export type CachedCompanyRow = {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
}

async function fetchOrgReferenceRows(orgId: string): Promise<Record<string, unknown>[]> {
  const supabase = await createServerSupabaseClient()

  let rows: Record<string, unknown>[] | null = null
  let error: { message: string; details?: string } | null = null

  const result = await supabase
    .from('references')
    .select(REFERENCE_ROWS_SELECT)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  error = result.error
  rows = result.data as Record<string, unknown>[] | null

  if (error) {
    const fallback = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_NO_CONTACT)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!fallback.error) {
      rows = fallback.data as Record<string, unknown>[]
      error = null
    }
  }

  if (error) {
    const withDeletedColumn = await supabase
      .from('references')
      .select(`${REFERENCE_ROWS_SELECT_NO_CONTACT}, deleted_at`)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (!withDeletedColumn.error && withDeletedColumn.data) {
      const data = withDeletedColumn.data as Record<string, unknown>[]
      rows = data.filter((r) => r.deleted_at == null || r.deleted_at === undefined)
      error = null
    }
  }

  if (error) {
    const noDeletedFilter = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_NO_CONTACT)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (!noDeletedFilter.error) {
      rows = noDeletedFilter.data as Record<string, unknown>[]
      error = null
    }
  }

  if (error) {
    const minimal = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_MINIMAL)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (!minimal.error) {
      rows = minimal.data as Record<string, unknown>[]
      error = null
    }
  }

  if (error) return []
  return rows ?? []
}

export function getCachedOrgReferenceRows(orgId: string): Promise<Record<string, unknown>[]> {
  return unstable_cache(() => fetchOrgReferenceRows(orgId), ['org-references', orgId], {
    tags: [referencesTag(orgId)],
  })()
}

async function fetchReferenceKpisForOrg(orgId: string): Promise<ReferenceKpiCounts> {
  const supabase = await createServerSupabaseClient()
  const base = () =>
    supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

  const [{ count: total }, { count: draft }, { count: internal_only }, { count: approved }] =
    await Promise.all([
      base(),
      base().eq('status', 'draft'),
      base().eq('status', 'internal_only'),
      base().in('status', ['approved', 'external']),
    ])

  return {
    total: total ?? 0,
    approved: approved ?? 0,
    internal: internal_only ?? 0,
    draft: draft ?? 0,
  }
}

export function getCachedReferenceKpis(orgId: string): Promise<ReferenceKpiCounts> {
  return unstable_cache(() => fetchReferenceKpisForOrg(orgId), ['org-kpis', orgId], {
    tags: [kpisTag(orgId), referencesTag(orgId)],
  })()
}

async function fetchOrgCompanies(orgId: string): Promise<CachedCompanyRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, industry')
    .eq('organization_id', orgId)
    .order('name')
  if (error) return []
  return (data ?? []) as CachedCompanyRow[]
}

export function getCachedOrgCompanies(orgId: string): Promise<CachedCompanyRow[]> {
  return unstable_cache(() => fetchOrgCompanies(orgId), ['org-companies', orgId], {
    tags: [companiesTag(orgId)],
  })()
}

async function fetchOrgComplianceDocuments(orgId: string): Promise<ComplianceDocumentRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('organization_compliance_documents')
    .select(COMPLIANCE_SELECT)
    .eq('organization_id', orgId)
    .order('document_type', { ascending: true })
    .order('is_current', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    if ((error.message ?? '').includes('organization_compliance_documents')) {
      return []
    }
    return []
  }
  return (data ?? []) as ComplianceDocumentRow[]
}

export function getCachedOrgComplianceDocuments(orgId: string): Promise<ComplianceDocumentRow[]> {
  return unstable_cache(() => fetchOrgComplianceDocuments(orgId), ['org-compliance', orgId], {
    tags: [complianceTag(orgId)],
  })()
}

/** Für KPI-Loader mit bestehendem Supabase-Client: orgId explizit, Daten aus Cache. */
export async function loadReferenceKpisForOrg(
  _supabase: SupabaseClient,
  orgId: string
): Promise<ReferenceKpiCounts> {
  return getCachedReferenceKpis(orgId)
}
