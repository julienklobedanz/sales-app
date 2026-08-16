import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { AccountsGrid } from './accounts-grid'
import { AccountsCollection } from './accounts-collection'
import { getReferencesByCompanyId, getActiveDealsByCompanyId } from './actions'
import { getNdaAgreementsByCompanyId } from './nda-actions'
import { accountLensLoads } from '@/lib/accounts/account-lens'
import {
  parseAccountsCollectionLayout,
  parseAccountsListView,
} from '@/lib/accounts/accounts-list-view'
import {
  resolveNdaDisplayStatus,
  type NdaDisplayStatus,
} from '@/lib/accounts/account-entity'
import type { AccountStatusValue } from '@/lib/accounts/account-status'
import { normalizeAccountStatus } from '@/lib/accounts/account-status'
import {
  buildAccountCardSecondaryMeta,
  resolveAccountCardPrimaryAction,
  type NextApprovalExpiry,
  type NextContractEnd,
} from '@/lib/accounts/account-card-primary-action'
import { isContractEndWithinWarningWindow } from '@/lib/accounts/contract-end'
import { NDA_EXPIRY_WARNING_DAYS, ndaDaysUntilExpiry } from '@/lib/accounts/nda-expiry'
import { syncComputedAccountStatuses } from '@/lib/accounts/sync-computed-account-statuses'
import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { syncHubSpotWonDealsForOrganization } from '@/lib/crm/sync-hubspot-won-deals'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/capability-access'

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

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; id?: string; openNda?: string }>
}) {
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
          'id, name, logo_url, website_url, headquarters, industry, employee_count, is_favorite, account_status, crm_account_id',
        )
        .eq('organization_id', orgId)
        .order('name')

      if (withFav.error && (withFav.error.message ?? '').includes('is_favorite')) {
        const basic = await supabase
          .from('companies')
          .select(
            'id, name, logo_url, website_url, headquarters, industry, employee_count',
          )
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
          'id, name, logo_url, website_url, headquarters, industry, employee_count, entity_kind, partner_category, linked_account_id, account_status, account_status_source, crm_account_id',
        )
        .eq('organization_id', orgId)
        .order('name')
      companies = (withoutFav.data ?? []).map((c) => ({ ...c, is_favorite: false }))
    } else if (msg.includes('account_status_source')) {
      const withoutSource = await supabase
        .from('companies')
        .select(
          'id, name, logo_url, website_url, headquarters, industry, employee_count, is_favorite, entity_kind, partner_category, linked_account_id, account_status, crm_account_id',
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
        .filter((id): id is string => Boolean(id)),
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
  const nextNdaExpiryByCompany: Record<string, string | null> = {}
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
        let soonest: string | null = null
        let soonestDays = Number.POSITIVE_INFINITY
        for (const row of rows) {
          if (!row.valid_until) continue
          const days = ndaDaysUntilExpiry(row.valid_until)
          if (days < soonestDays) {
            soonestDays = days
            soonest = row.valid_until
          }
        }
        nextNdaExpiryByCompany[companyId] = soonest
      }
    }
  }

  const { systemRole } = parseProfileRoles(profile)
  const isAdmin = isSystemAdmin(systemRole)
  const hubspotConfigured = isHubSpotConfigured()
  const hubspotStatus =
    isAdmin && profile.organization_id
      ? await getOrganizationCrmConnectionPublicStatus(
          supabase,
          profile.organization_id,
          'hubspot',
        )
      : { connected: false, externalAccountId: null, lastSyncAt: null }

  if (hubspotStatus.connected && isAdmin) {
    try {
      await syncHubSpotWonDealsForOrganization(supabase, orgId, 'hubspot')
    } catch {
      // Won-Sync blockiert die Übersicht nicht.
    }
  }

  const [
    dealsRows,
    refRows,
    executiveSignalRows,
    newsSignalRows,
  ] = await Promise.all([
    companyIds.length
      ? supabase
          .from('deals')
          .select(
            'id, company_id, status, title, expiry_date, contract_end_date, updated_at, created_at',
          )
          .in('company_id', companyIds)
          .eq('organization_id', orgId)
      : Promise.resolve({
          data: [] as
            | {
                id: string
                company_id: string | null
                status: string
                title: string
                expiry_date: string | null
                contract_end_date: string | null
                updated_at: string | null
                created_at: string | null
              }[]
            | null,
        }),
    companyIds.length
      ? supabase
          .from('references')
          .select('id, company_id, title, approval_expires_at, approval_grace_until')
          .in('company_id', companyIds)
          .is('deleted_at', null)
      : Promise.resolve({
          data: [] as
            | {
                id: string
                company_id: string | null
                title: string | null
                approval_expires_at: string | null
                approval_grace_until: string | null
              }[]
            | null,
        }),
    companyIds.length
      ? supabase
          .from('market_signal_executive_events')
          .select(
            'company_id, change_summary, person_name, person_title_after, detected_at, insight_signal_fact',
          )
          .in('company_id', companyIds)
          .order('detected_at', { ascending: false })
          .limit(4000)
      : Promise.resolve({
          data: [] as
            | {
                company_id: string | null
                change_summary: string
                person_name: string
                person_title_after: string | null
                detected_at: string
                insight_signal_fact: string | null
              }[]
            | null,
        }),
    companyIds.length
      ? supabase
          .from('market_signal_account_news')
          .select('company_id, body, insight_signal_fact, published_on')
          .in('company_id', companyIds)
          .order('published_on', { ascending: false })
          .limit(4000)
      : Promise.resolve({
          data: [] as
            | {
                company_id: string | null
                body: string
                insight_signal_fact: string | null
                published_on: string
              }[]
            | null,
        }),
  ])

  type DealEnrichRow = {
    id: string
    company_id: string | null
    status: string
    title?: string
    expiry_date: string | null
    contract_end_date?: string | null
    updated_at: string | null
    created_at: string | null
  }

  let dealsData = (dealsRows.data ?? []) as DealEnrichRow[]
  if (
    dealsRows &&
    'error' in dealsRows &&
    dealsRows.error &&
    String(dealsRows.error.message ?? '').includes('contract_end_date')
  ) {
    const fallback = companyIds.length
      ? await supabase
          .from('deals')
          .select('id, company_id, status, title, expiry_date, updated_at, created_at')
          .in('company_id', companyIds)
          .eq('organization_id', orgId)
      : { data: [] as DealEnrichRow[] }
    dealsData = ((fallback.data ?? []) as DealEnrichRow[]).map((d) => ({
      ...d,
      contract_end_date: null,
    }))
  }

  type RefEnrichRow = {
    id: string
    company_id: string | null
    title?: string | null
    approval_expires_at: string | null
    approval_grace_until: string | null
  }
  const refsData = (refRows.data ?? []) as RefEnrichRow[]

  let effectiveStatusByCompany: Record<string, AccountStatusValue | null> = {}
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
      refsData,
    )
  } catch {
    for (const c of companies ?? []) {
      effectiveStatusByCompany[c.id] = normalizeAccountStatus(c.account_status)
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
  const signalCountByCompany: Record<string, number> = {}
  const latestSignalByCompany: Record<string, { at: number; summary: string }> = {}

  for (const row of executiveSignalRows.data ?? []) {
    if (!row.company_id) continue
    signalCountByCompany[row.company_id] = (signalCountByCompany[row.company_id] ?? 0) + 1
    const summary =
      (row.insight_signal_fact ?? '').trim() ||
      (row.change_summary ?? '').trim() ||
      [row.person_name, row.person_title_after].filter(Boolean).join(' · ')
    if (!summary) continue
    const at = new Date(row.detected_at).getTime()
    const prev = latestSignalByCompany[row.company_id]
    if (!prev || at > prev.at) {
      latestSignalByCompany[row.company_id] = { at, summary: summary.slice(0, 80) }
    }
  }
  for (const row of newsSignalRows.data ?? []) {
    if (!row.company_id) continue
    signalCountByCompany[row.company_id] = (signalCountByCompany[row.company_id] ?? 0) + 1
    const summary =
      (row.insight_signal_fact ?? '').trim() || (row.body ?? '').trim().slice(0, 80)
    if (!summary) continue
    const at = new Date(`${row.published_on}T12:00:00`).getTime()
    const prev = latestSignalByCompany[row.company_id]
    if (!prev || at > prev.at) {
      latestSignalByCompany[row.company_id] = { at, summary: summary.slice(0, 80) }
    }
  }

  const nextApprovalByCompany: Record<string, NextApprovalExpiry | null> = {}
  const now = new Date()
  for (const r of refsData) {
    if (!r.company_id) continue
    const candidates = [r.approval_expires_at, r.approval_grace_until].filter(
      (v): v is string => Boolean(v?.trim()),
    )
    for (const expiresAt of candidates) {
      const end = new Date(expiresAt.includes('T') ? expiresAt : `${expiresAt}T12:00:00`)
      if (Number.isNaN(end.getTime())) continue
      const days = Math.round((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      if (days > NDA_EXPIRY_WARNING_DAYS) continue
      const prev = nextApprovalByCompany[r.company_id]
      if (!prev || new Date(expiresAt).getTime() < new Date(prev.expiresAt).getTime()) {
        nextApprovalByCompany[r.company_id] = {
          title: r.title ?? null,
          expiresAt,
        }
      }
    }
  }

  const nextContractByCompany: Record<string, NextContractEnd | null> = {}
  for (const d of dealsData) {
    if (!d.company_id || d.status !== 'won') continue
    const endDate = d.contract_end_date ?? null
    if (!isContractEndWithinWarningWindow(endDate, now)) continue
    const prev = nextContractByCompany[d.company_id]
    if (
      !prev ||
      new Date(endDate!).getTime() < new Date(prev.contractEndDate).getTime()
    ) {
      nextContractByCompany[d.company_id] = {
        title: d.title ?? 'Vertrag',
        contractEndDate: endDate!,
      }
    }
  }

  const enrichedCompanies =
    (companies ?? []).map((c) => {
      const accountStatus =
        effectiveStatusByCompany[c.id] ?? normalizeAccountStatus(c.account_status)
      const openDealsCount = dealCountByCompany[c.id] ?? 0
      const referenceCount = refCountByCompany[c.id] ?? 0
      const ndaStatus = ndaStatusByCompany[c.id] ?? 'none'
      const primary_action = resolveAccountCardPrimaryAction({
        accountStatus,
        nextApproval: nextApprovalByCompany[c.id] ?? null,
        nextContract: nextContractByCompany[c.id] ?? null,
        nextNdaExpiry: nextNdaExpiryByCompany[c.id] ?? null,
        ndaStatus,
        latestSignalSummary: latestSignalByCompany[c.id]?.summary ?? null,
        openDealsCount,
        referenceCount,
      })
      return {
        ...c,
        entity_kind: (c.entity_kind === 'partner' ? 'partner' : 'account') as
          | 'account'
          | 'partner',
        account_status: accountStatus,
        open_deals_count: openDealsCount,
        reference_count: referenceCount,
        signal_count: signalCountByCompany[c.id] ?? 0,
        latest_signal_summary: latestSignalByCompany[c.id]?.summary ?? null,
        nda_status: ndaStatus,
        linked_account_name: c.linked_account_id
          ? (linkedAccountNameById[c.linked_account_id] ?? null)
          : null,
        primary_action,
        secondary_meta: buildAccountCardSecondaryMeta({
          ndaStatus,
          openDealsCount,
          referenceCount,
          primaryKind: primary_action.kind,
        }),
        sort_urgency_at:
          nextApprovalByCompany[c.id]?.expiresAt ??
          nextContractByCompany[c.id]?.contractEndDate ??
          null,
      }
    }) ?? []

  const sp = (await searchParams) ?? {}
  const paramBag = {
    get(key: string) {
      const value = sp[key as keyof typeof sp]
      return typeof value === 'string' ? value : null
    },
  }
  const listView = parseAccountsListView(paramBag)
  const layout = parseAccountsCollectionLayout(paramBag)
  const selectedId = typeof sp.id === 'string' ? sp.id : null

  let lensPayload = null
  if (listView !== 'partner' && layout === 'inbox' && selectedId) {
    const [references, activeDeals, ndaResult] = await Promise.all([
      accountLensLoads('references')
        ? getReferencesByCompanyId(selectedId)
        : Promise.resolve([]),
      accountLensLoads('deals')
        ? getActiveDealsByCompanyId(selectedId)
        : Promise.resolve([]),
      accountLensLoads('nda')
        ? getNdaAgreementsByCompanyId(selectedId)
        : Promise.resolve({ success: true as const, rows: [] }),
    ])
    lensPayload = {
      references,
      activeDeals,
      ndaAgreements: ndaResult.success ? ndaResult.rows : [],
    }
  }

  const accountCompanies = enrichedCompanies.filter(
    (c) => (c.entity_kind ?? 'account') !== 'partner',
  )

  return (
    <div className="flex flex-col space-y-6">
      {listView === 'partner' ? (
        <AccountsGrid
          companies={enrichedCompanies}
          hubspotConfigured={hubspotConfigured}
          hubspotConnected={hubspotStatus.connected}
          canConnectCrm={isAdmin && hubspotConfigured}
        />
      ) : (
        <AccountsCollection
          companies={accountCompanies}
          lensPayload={lensPayload}
          hubspotConfigured={hubspotConfigured}
          hubspotConnected={hubspotStatus.connected}
          canConnectCrm={isAdmin && hubspotConfigured}
          layout={layout}
        />
      )}
    </div>
  )
}
