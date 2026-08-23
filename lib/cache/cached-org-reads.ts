import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { companiesTag, complianceTag, kpisTag, referencesTag } from '@/lib/cache/tags'
import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import type { ReferenceKpiCounts } from '@/lib/dashboard-home/dashboard-home-types'
import type { Database } from '@/lib/database.types'
import type { Tables } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

type DbClient = SupabaseClient<Database>

/** Service-Role in unstable_cache (kein cookies()); Grenze: orgId-Filter in fetcher.
 * Caller dürfen nur Session-/Server-Org-IDs übergeben — nie Client-Input als orgId. */
function assertOrgId(orgId: string): string {
  const id = orgId.trim()
  if (!id) {
    throw new Error('cached-org-reads: organizationId required')
  }
  return id
}

function readWithOrgCache<T>(
  cacheKey: string,
  orgId: string,
  tags: string[],
  fetcher: (client: DbClient, orgId: string) => Promise<T>,
): Promise<T> {
  const scopedOrgId = assertOrgId(orgId)
  // Service-Role weil: unstable_cache darf cookies()/Session-Client nicht nutzen.
  // Grenze: jede Query in fetcher filtert .eq('organization_id', scopedOrgId); Caller liefert Session-Org.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return createServerSupabaseClient().then((client) => fetcher(client, scopedOrgId))
  }
  return unstable_cache(() => fetcher(admin, scopedOrgId), [cacheKey, scopedOrgId], {
    tags,
  })()
}

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
      approval_competitor_blacklist,
      approval_requested_at,
      approval_internal_status,
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
    is_nda_deal, approval_competitor_blacklist, approval_requested_at, approval_internal_status,
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
    approval_competitor_blacklist, approval_requested_at, approval_internal_status,
    companies ( name, logo_url )
  `

export type CachedCompanyRow = {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
}

/** Org-Referenzzeile inkl. Joins; optionale Felder fehlen ggf. in Schema-Fallback-Selects. */
export type CachedOrgReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  status: Tables<'references'>['status'] | string
  customer_approval_status: string | null
  approval_scope_named_mention: boolean | null
  approval_scope_anonymous_mention: boolean | null
  created_at: string | null
  updated_at: string | null
  company_id: string
  contact_id: string | null
  customer_contact_id: string | null
  customer_contact: string | null
  file_path: string | null
  tags: string | null
  project_status: string | null
  project_start: string | null
  project_end: string | null
  is_nda_deal: boolean
  approval_competitor_blacklist: string[]
  approval_requested_at: string | null
  approval_internal_status: string | null
  companies: unknown
  contact_persons?: unknown
}

function toCachedOrgReferenceRow(row: {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  status: Tables<'references'>['status'] | string
  customer_approval_status: string | null
  approval_scope_named_mention: boolean | null
  approval_scope_anonymous_mention: boolean | null
  created_at: string | null
  updated_at: string | null
  company_id: string
  contact_id: string | null
  customer_contact_id?: string | null
  customer_contact?: string | null
  file_path: string | null
  tags: string | null
  project_status: string | null
  project_start: string | null
  project_end: string | null
  is_nda_deal?: boolean | null
  approval_competitor_blacklist?: string[] | null
  approval_requested_at?: string | null
  approval_internal_status?: string | null
  companies: unknown
  contact_persons?: unknown
}): CachedOrgReferenceRow {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    industry: row.industry,
    country: row.country,
    website: row.website,
    employee_count: row.employee_count,
    volume_eur: row.volume_eur,
    contract_type: row.contract_type,
    incumbent_provider: row.incumbent_provider,
    competitors: row.competitors,
    customer_challenge: row.customer_challenge,
    our_solution: row.our_solution,
    status: row.status,
    customer_approval_status: row.customer_approval_status,
    approval_scope_named_mention: row.approval_scope_named_mention,
    approval_scope_anonymous_mention: row.approval_scope_anonymous_mention,
    created_at: row.created_at,
    updated_at: row.updated_at,
    company_id: row.company_id,
    contact_id: row.contact_id,
    customer_contact_id: row.customer_contact_id ?? null,
    customer_contact: row.customer_contact ?? null,
    file_path: row.file_path,
    tags: row.tags,
    project_status: row.project_status,
    project_start: row.project_start,
    project_end: row.project_end,
    is_nda_deal: row.is_nda_deal ?? false,
    approval_competitor_blacklist: row.approval_competitor_blacklist ?? [],
    approval_requested_at: row.approval_requested_at ?? null,
    approval_internal_status: row.approval_internal_status ?? null,
    companies: row.companies,
    contact_persons: row.contact_persons,
  }
}

async function fetchOrgReferenceRows(
  supabase: DbClient,
  orgId: string,
): Promise<CachedOrgReferenceRow[]> {
  let rows: CachedOrgReferenceRow[] | null = null
  let error: { message: string; details?: string } | null = null

  const result = await supabase
    .from('references')
    .select(REFERENCE_ROWS_SELECT)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  error = result.error
  if (!error && result.data) {
    rows = result.data.map(toCachedOrgReferenceRow)
  }

  if (error) {
    const fallback = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_NO_CONTACT)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!fallback.error && fallback.data) {
      rows = fallback.data.map(toCachedOrgReferenceRow)
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
      rows = withDeletedColumn.data
        .filter((r) => r.deleted_at == null)
        .map(toCachedOrgReferenceRow)
      error = null
    }
  }

  if (error) {
    const noDeletedFilter = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_NO_CONTACT)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (!noDeletedFilter.error && noDeletedFilter.data) {
      rows = noDeletedFilter.data.map(toCachedOrgReferenceRow)
      error = null
    }
  }

  if (error) {
    const minimal = await supabase
      .from('references')
      .select(REFERENCE_ROWS_SELECT_MINIMAL)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (!minimal.error && minimal.data) {
      rows = minimal.data.map(toCachedOrgReferenceRow)
      error = null
    }
  }

  if (error) return []
  return rows ?? []
}

export function getCachedOrgReferenceRows(
  orgId: string,
): Promise<CachedOrgReferenceRow[]> {
  return readWithOrgCache(
    'org-references',
    orgId,
    [referencesTag(orgId)],
    fetchOrgReferenceRows,
  )
}

async function fetchReferenceKpisForOrg(
  supabase: DbClient,
  orgId: string,
): Promise<ReferenceKpiCounts> {
  const base = () =>
    supabase
      .from('references')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

  const [
    { count: total },
    { count: draft },
    { count: internal_only },
    { count: approved },
  ] = await Promise.all([
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

function getCachedReferenceKpis(orgId: string): Promise<ReferenceKpiCounts> {
  return readWithOrgCache(
    'org-kpis',
    orgId,
    [kpisTag(orgId), referencesTag(orgId)],
    fetchReferenceKpisForOrg,
  )
}

async function fetchOrgCompanies(
  supabase: DbClient,
  orgId: string,
): Promise<CachedCompanyRow[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, industry')
    .eq('organization_id', orgId)
    .order('name')
  if (error) return []
  return data ?? []
}

export function getCachedOrgCompanies(orgId: string): Promise<CachedCompanyRow[]> {
  return readWithOrgCache(
    'org-companies',
    orgId,
    [companiesTag(orgId)],
    fetchOrgCompanies,
  )
}

async function fetchOrgComplianceDocuments(
  supabase: DbClient,
  orgId: string,
): Promise<ComplianceDocumentRow[]> {
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

export function getCachedOrgComplianceDocuments(
  orgId: string,
): Promise<ComplianceDocumentRow[]> {
  return readWithOrgCache(
    'org-compliance',
    orgId,
    [complianceTag(orgId)],
    fetchOrgComplianceDocuments,
  )
}

/** Für KPI-Loader mit bestehendem Supabase-Client: orgId explizit, Daten aus Cache. */
export async function loadReferenceKpisForOrg(
  _supabase: SupabaseClient,
  orgId: string,
): Promise<ReferenceKpiCounts> {
  return getCachedReferenceKpis(orgId)
}
