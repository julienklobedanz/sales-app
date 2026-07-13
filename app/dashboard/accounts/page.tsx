import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { CompaniesGrid } from './companies-grid'
import { resolveNdaDisplayStatus, type NdaDisplayStatus } from '@/lib/accounts/company-entity'
import type { CompanyAccountStatusValue } from '@/lib/accounts/company-account-status'
import { normalizeCompanyAccountStatus } from '@/lib/accounts/company-account-status'
import { syncComputedAccountStatuses } from '@/lib/accounts/sync-computed-account-statuses'
import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { syncHubSpotWonDealsForOrganization } from '@/lib/crm/sync-hubspot-won-deals'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'

type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  headquarters: string | null
  industry: string | null
  employee_count: number | null
  is_favorite?: boolean | null
  entity_kind?: string | null
  partner_category?: string | null
  linked_account_id?: string | null
  account_status?: string | null
  account_status_source?: string | null
  crm_account_id?: string | null
}

export default async function AccountsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect(ROUTES.onboarding)

  const orgId = profile.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  const extendedSelect =
    'id, name, logo_url, website_url, headquarters, industry, employee_count, is_favorite, entity_kind, partner_category, linked_account_id, account_status, account_status_source, crm_account_id'

  let companies: CompanyRow[] | null = null

  const withExtended = await supabase
    .from('companies')
    .select(extendedSelect)
    .eq('organization_id', orgId)
    .order('name')

  if (withExtended.error) {
    const msg = withExtended.error.message ?? ''
    if (
      msg.includes('entity_kind') ||
      msg.includes('partner_category') ||
      msg.includes('linked_account_id')
    ) {
      const withFav = await supabase
        .from('companies')
        .select(
          'id, name, logo_url, website_url, headquarters, industry, employee_count, is_favorite, account_status, crm_account_id'
        )
        .eq('organization_id', orgId)
        .order('name')

      if (withFav.error && (withFav.error.message ?? '').includes('is_favorite')) {
        const basic = await supabase
          .from('companies')
          .select('id, name, logo_url, website_url, headquarters, industry, employee_count')
          .eq('organization_id', orgId)
          .order('name')
        companies = (basic.data ?? []).map((c) => ({
          ...c,
          is_favorite: false,
          entity_kind: 'account',
          partner_category: null,
          linked_account_id: null,
          account_status: null,
          account_status_source: null,
          crm_account_id: null,
        }))
      } else {
        companies = (withFav.data ?? []).map((c) => ({
          ...c,
          entity_kind: 'account',
          partner_category: null,
          linked_account_id: null,
          account_status_source: null,
        }))
      }
    } else if (msg.includes('is_favorite')) {
      const withoutFav = await supabase
        .from('companies')
        .select(
          'id, name, logo_url, website_url, headquarters, industry, employee_count, entity_kind, partner_category, linked_account_id, account_status, account_status_source, crm_account_id'
        )
        .eq('organization_id', orgId)
        .order('name')
      companies = (withoutFav.data ?? []).map((c) => ({ ...c, is_favorite: false }))
    } else if (msg.includes('account_status_source')) {
      const withoutSource = await supabase
        .from('companies')
        .select(
          'id, name, logo_url, website_url, headquarters, industry, employee_count, is_favorite, entity_kind, partner_category, linked_account_id, account_status, crm_account_id'
        )
        .eq('organization_id', orgId)
        .order('name')
      companies = (withoutSource.data ?? []).map((c) => ({
        ...c,
        account_status_source: null,
      }))
    } else {
      companies = []
    }
  } else {
    companies = withExtended.data ?? []
  }

  const linkedAccountIds = [
    ...new Set(
      (companies ?? [])
        .map((c) => c.linked_account_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const linkedAccountNameById: Record<string, string> = {}
  if (linkedAccountIds.length) {
    const { data: linkedRows } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', linkedAccountIds)
    for (const row of linkedRows ?? []) {
      linkedAccountNameById[row.id] = row.name
    }
  }

  const companyIds = (companies ?? []).map((c) => c.id)

  const ndaStatusByCompany: Record<string, NdaDisplayStatus> = {}
  if (companyIds.length) {
    const ndaRes = await supabase
      .from('nda_agreements')
      .select('company_id, status, valid_until, file_storage_path')
      .eq('organization_id', orgId)
      .in('company_id', companyIds)

    if (!ndaRes.error) {
      const grouped: Record<
        string,
        { status: string; valid_until: string | null; file_storage_path: string | null }[]
      > = {}
      for (const row of ndaRes.data ?? []) {
        if (!row.company_id) continue
        grouped[row.company_id] = grouped[row.company_id] ?? []
        grouped[row.company_id].push({
          status: row.status,
          valid_until: row.valid_until,
          file_storage_path: row.file_storage_path,
        })
      }
      for (const [companyId, rows] of Object.entries(grouped)) {
        ndaStatusByCompany[companyId] = resolveNdaDisplayStatus(rows)
      }
    }
  }

  const { systemRole } = parseProfileRoles(profile)
  const isAdmin = isSystemAdmin(systemRole)
  const hubspotConfigured = isHubSpotConfigured()
  const hubspotStatus =
    isAdmin && profile.organization_id
      ? await getOrganizationCrmConnectionPublicStatus(supabase, profile.organization_id, 'hubspot')
      : { connected: false, externalAccountId: null, lastSyncAt: null }

  if (hubspotStatus.connected && isAdmin) {
    try {
      await syncHubSpotWonDealsForOrganization(supabase, orgId, 'hubspot')
    } catch {
      // Won-Sync blockiert die Übersicht nicht.
    }
  }

  const [dealsRows, refRows, stakeholderRows, strategyRows, executiveSignalRows, newsSignalRows] =
    await Promise.all([
      companyIds.length
        ? supabase
            .from('deals')
            .select('id, company_id, status, expiry_date, updated_at, created_at')
            .in('company_id', companyIds)
            .eq('organization_id', orgId)
        : Promise.resolve({
            data: [] as {
              id: string
              company_id: string | null
              status: string
              expiry_date: string | null
              updated_at: string | null
              created_at: string | null
            }[] | null,
          }),
      companyIds.length
        ? supabase
            .from('references')
            .select('id, company_id, approval_expires_at, approval_grace_until')
            .in('company_id', companyIds)
            .is('deleted_at', null)
        : Promise.resolve({
            data: [] as {
              id: string
              company_id: string | null
              approval_expires_at: string | null
              approval_grace_until: string | null
            }[] | null,
          }),
      companyIds.length
        ? supabase
            .from('stakeholders')
            .select('id, company_id')
            .in('company_id', companyIds)
        : Promise.resolve({ data: [] as { id: string; company_id: string | null }[] | null }),
      companyIds.length
        ? supabase
            .from('company_strategies')
            .select('company_id, main_goals, red_flags, competitive_situation, next_steps')
            .in('company_id', companyIds)
        : Promise.resolve({
            data: [] as {
              company_id: string
              main_goals: string | null
              red_flags: string | null
              competitive_situation: string | null
              next_steps: string | null
            }[] | null,
          }),
      companyIds.length
        ? supabase
            .from('market_signal_executive_events')
            .select('company_id')
            .in('company_id', companyIds)
            .limit(4000)
        : Promise.resolve({ data: [] as { company_id: string | null }[] | null }),
      companyIds.length
        ? supabase
            .from('market_signal_account_news')
            .select('company_id')
            .in('company_id', companyIds)
            .limit(4000)
        : Promise.resolve({ data: [] as { company_id: string | null }[] | null }),
    ])

  const dealsData = dealsRows.data ?? []
  const refsData = refRows.data ?? []

  let effectiveStatusByCompany: Record<string, CompanyAccountStatusValue | null> = {}
  try {
    effectiveStatusByCompany = await syncComputedAccountStatuses(
      supabase,
      (companies ?? []).map((c) => ({
        id: c.id,
        account_status: c.account_status ?? null,
        account_status_source: c.account_status_source ?? null,
        crm_account_id: c.crm_account_id ?? null,
        entity_kind: c.entity_kind ?? 'account',
      })),
      dealsData,
      refsData
    )
  } catch {
    for (const c of companies ?? []) {
      effectiveStatusByCompany[c.id] = normalizeCompanyAccountStatus(c.account_status)
    }
  }

  const activeDealStatuses = new Set([
    'in_negotiation',
    'rfp_phase',
    'on_hold',
    'reference_sought',
    'in_approval',
    'reference_found',
  ])

  const dealCountByCompany: Record<string, number> = {}
  for (const d of dealsData) {
    if (!d.company_id) continue
    if (!activeDealStatuses.has(d.status)) continue
    dealCountByCompany[d.company_id] = (dealCountByCompany[d.company_id] ?? 0) + 1
  }
  const refCountByCompany: Record<string, number> = {}
  for (const r of refsData) {
    if (!r.company_id) continue
    refCountByCompany[r.company_id] = (refCountByCompany[r.company_id] ?? 0) + 1
  }
  const stakeholderCountByCompany: Record<string, number> = {}
  for (const s of stakeholderRows.data ?? []) {
    if (!s.company_id) continue
    stakeholderCountByCompany[s.company_id] = (stakeholderCountByCompany[s.company_id] ?? 0) + 1
  }
  const strategyFilledByCompany: Record<string, boolean> = {}
  for (const st of strategyRows.data ?? []) {
    if (!st.company_id) continue
    const filled = Boolean(
      (st.main_goals ?? '').trim() ||
        (st.red_flags ?? '').trim() ||
        (st.competitive_situation ?? '').trim() ||
        (st.next_steps ?? '').trim()
    )
    strategyFilledByCompany[st.company_id] = filled
  }
  const signalCountByCompany: Record<string, number> = {}
  for (const row of executiveSignalRows.data ?? []) {
    if (!row.company_id) continue
    signalCountByCompany[row.company_id] = (signalCountByCompany[row.company_id] ?? 0) + 1
  }
  for (const row of newsSignalRows.data ?? []) {
    if (!row.company_id) continue
    signalCountByCompany[row.company_id] = (signalCountByCompany[row.company_id] ?? 0) + 1
  }

  const enrichedCompanies =
    (companies ?? []).map((c) => ({
      ...c,
      entity_kind: (c.entity_kind === 'partner' ? 'partner' : 'account') as 'account' | 'partner',
      account_status:
        effectiveStatusByCompany[c.id] ?? normalizeCompanyAccountStatus(c.account_status),
      open_deals_count: dealCountByCompany[c.id] ?? 0,
      reference_count: refCountByCompany[c.id] ?? 0,
      stakeholder_count: stakeholderCountByCompany[c.id] ?? 0,
      strategy_filled: strategyFilledByCompany[c.id] ?? false,
      signal_count: signalCountByCompany[c.id] ?? 0,
      nda_status: ndaStatusByCompany[c.id] ?? 'none',
      linked_account_name: c.linked_account_id
        ? linkedAccountNameById[c.linked_account_id] ?? null
        : null,
    })) ?? []

  return (
    <div className="flex flex-col space-y-6">
      <CompaniesGrid
        companies={enrichedCompanies}
        hubspotConfigured={hubspotConfigured}
        hubspotConnected={hubspotStatus.connected}
        canConnectCrm={isAdmin && hubspotConfigured}
      />
    </div>
  )
}
