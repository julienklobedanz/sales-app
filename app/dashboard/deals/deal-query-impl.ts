import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile } from '@/lib/auth/request-user'
import { normalizeDealStatus } from '@/lib/deals/normalize-deal-status'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import type { DealRow, DealWithReferences } from './types'

async function getSessionOrgId(): Promise<string | null> {
  const profile = await getRequestProfile()
  return profile?.organization_id ?? null
}

export async function getDealsImpl(): Promise<DealRow[]> {
  const supabase = await createServerSupabaseClient()
  const orgId = await getSessionOrgId()
  if (!orgId) return []

  const { data: rows, error } = await supabase
    .from('deals')
    .select(
      `
      id,
      title,
      company_id,
      industry,
      volume,
      requirements_text,
      incumbent_provider,
      is_public,
      account_manager_id,
      sales_manager_id,
      status,
      is_rfp_mode,
      expiry_date,
      created_at,
      updated_at,
      companies ( name, logo_url )
    `,
    )
    .eq('organization_id', orgId)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error) return []

  const dealIds = (rows ?? []).map((r) => r.id)
  const linkedRefsMap: Record<
    string,
    { id: string; title: string; company_name: string; logo_url?: string | null }[]
  > = {}
  dealIds.forEach((id) => {
    linkedRefsMap[id] = []
  })

  const bestScoreMap: Record<string, number | null> = {}
  for (const id of dealIds) bestScoreMap[id] = null

  if (dealIds.length > 0) {
    const { data: drRows } = await supabase
      .from('deal_references')
      .select('deal_id, reference_id, similarity_score')
      .in('deal_id', dealIds)

    for (const dr of drRows ?? []) {
      const sc = dr.similarity_score
      if (typeof sc === 'number' && !Number.isNaN(sc)) {
        const prev = bestScoreMap[dr.deal_id]
        if (prev == null || sc > prev) bestScoreMap[dr.deal_id] = sc
      }
    }

    const refIds = [
      ...new Set((drRows ?? []).map((r) => r.reference_id).filter(Boolean)),
    ] as string[]
    if (refIds.length > 0) {
      const { data: refs } = await supabase
        .from('references')
        .select('id, title, companies(name, logo_url)')
        .in('id', refIds)
      const refMap: Record<
        string,
        { id: string; title: string; company_name: string; logo_url?: string | null }
      > = {}
      for (const r of refs ?? []) {
        const company = accountFromJoin(r.companies)
        refMap[r.id] = {
          id: r.id,
          title: r.title ?? '',
          company_name: company?.name ?? '—',
          logo_url: company?.logoUrl ?? null,
        }
      }
      for (const dr of drRows ?? []) {
        const ref = refMap[dr.reference_id]
        if (ref && linkedRefsMap[dr.deal_id]) linkedRefsMap[dr.deal_id].push(ref)
      }
    }
  }

  const accountManagerIds = [
    ...new Set((rows ?? []).map((r) => r.account_manager_id).filter(Boolean)),
  ] as string[]
  const salesManagerIds = [
    ...new Set((rows ?? []).map((r) => r.sales_manager_id).filter(Boolean)),
  ] as string[]
  const allUserIds = [...new Set([...accountManagerIds, ...salesManagerIds])]

  const names: Record<string, string> = {}
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds)
    for (const p of profiles ?? []) {
      names[p.id] = p.full_name ?? p.id.slice(0, 8)
    }
  }

  return (rows ?? []).map((r) => {
    const company = accountFromJoin(r.companies)
    return {
      id: r.id,
      title: r.title ?? '',
      company_id: r.company_id ?? null,
      company_name: company?.name ?? null,
      company_logo_url: company?.logoUrl ?? null,
      industry: r.industry ?? null,
      volume: r.volume ?? null,
      requirements_text: r.requirements_text ?? null,
      incumbent_provider: r.incumbent_provider ?? null,
      is_public: r.is_public ?? true,
      account_manager_id: r.account_manager_id ?? null,
      account_manager_name: r.account_manager_id
        ? (names[r.account_manager_id] ?? null)
        : null,
      sales_manager_id: r.sales_manager_id ?? null,
      sales_manager_name: r.sales_manager_id ? (names[r.sales_manager_id] ?? null) : null,
      status: normalizeDealStatus(r.status),
      is_rfp_mode: Boolean(r.is_rfp_mode),
      expiry_date: r.expiry_date ?? null,
      created_at: r.created_at ?? '',
      updated_at: r.updated_at ?? null,
      linked_refs: linkedRefsMap[r.id] ?? [],
      best_match_score: bestScoreMap[r.id] ?? null,
    }
  })
}

export async function getDealWithReferencesImpl(
  id: string,
): Promise<DealWithReferences | null> {
  const supabase = await createServerSupabaseClient()
  const orgId = await getSessionOrgId()
  if (!orgId) return null

  const dealSelect = `
      id,
      title,
      company_id,
      industry,
      volume,
      requirements_text,
      incumbent_provider,
      is_public,
      account_manager_id,
      sales_manager_id,
      status,
      is_rfp_mode,
      expiry_date,
      created_at,
      updated_at,
      companies ( name )
    `

  const { data: deal, error } = await supabase
    .from('deals')
    .select(dealSelect)
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error || !deal) return null

  const { data: drRows } = await supabase
    .from('deal_references')
    .select('reference_id, similarity_score')
    .eq('deal_id', id)

  const refIds = (drRows ?? []).map((r) => r.reference_id).filter(Boolean) as string[]
  const scoreByRefId: Record<string, number | null> = {}
  ;(drRows ?? []).forEach((r) => {
    if (!r.reference_id) return
    scoreByRefId[r.reference_id] =
      typeof r.similarity_score === 'number' ? r.similarity_score : null
  })

  const references: DealWithReferences['references'] = []
  if (refIds.length > 0) {
    const { data: refs } = await supabase
      .from('references')
      .select('id, title, summary, tags, companies(name, logo_url)')
      .in('id', refIds)
    for (const r of refs ?? []) {
      const company = accountFromJoin(r.companies)
      references.push({
        id: r.id,
        title: r.title ?? '',
        company_name: company?.name ?? '—',
        logo_url: company?.logoUrl ?? null,
        summary: r.summary ?? null,
        tags: r.tags ?? null,
        similarity_score: scoreByRefId[r.id] ?? null,
      })
    }
  }

  const accountManagerName = deal.account_manager_id
    ? ((
        await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', deal.account_manager_id)
          .single()
      ).data?.full_name ?? null)
    : null
  const salesManagerName = deal.sales_manager_id
    ? ((
        await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', deal.sales_manager_id)
          .single()
      ).data?.full_name ?? null)
    : null

  const company = accountFromJoin(deal.companies)

  const best_match_score = references.reduce<number | null>((max, ref) => {
    const s = ref.similarity_score
    if (typeof s !== 'number' || Number.isNaN(s)) return max
    if (max == null || s > max) return s
    return max
  }, null)

  const linked_refs = references.map((r) => ({
    id: r.id,
    title: r.title,
    company_name: r.company_name,
    logo_url: r.logo_url ?? null,
  }))

  return {
    id: deal.id,
    title: deal.title ?? '',
    company_id: deal.company_id ?? null,
    company_name: company?.name ?? null,
    industry: deal.industry ?? null,
    volume: deal.volume ?? null,
    requirements_text: deal.requirements_text ?? null,
    incumbent_provider: deal.incumbent_provider ?? null,
    is_public: deal.is_public ?? true,
    account_manager_id: deal.account_manager_id ?? null,
    account_manager_name: accountManagerName,
    sales_manager_id: deal.sales_manager_id ?? null,
    sales_manager_name: salesManagerName,
    status: normalizeDealStatus(deal.status),
    is_rfp_mode: Boolean(deal.is_rfp_mode),
    expiry_date: deal.expiry_date ?? null,
    created_at: deal.created_at ?? '',
    updated_at: deal.updated_at ?? null,
    linked_refs,
    best_match_score,
    references,
  }
}

/** Referenzen der eigenen Org (id, title, company_name) für Verknüpfung mit Deal */
export async function getReferencesForOrgImpl(): Promise<
  { id: string; title: string; company_name: string }[]
> {
  const supabase = await createServerSupabaseClient()
  const orgId = await getSessionOrgId()
  if (!orgId) return []

  const { data: rows } = await supabase
    .from('references')
    .select('id, title, companies(name)')
    .eq('organization_id', orgId)
    .order('title')
  if (!rows) return []

  return rows.map((r) => {
    const company = accountFromJoin(r.companies)
    return {
      id: r.id,
      title: r.title ?? '',
      company_name: company?.name ?? '—',
    }
  })
}
