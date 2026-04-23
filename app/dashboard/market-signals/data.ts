import 'server-only'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ExecutiveTrackingRow = {
  id: string
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  personName: string
  personTitleBefore: string | null
  personTitleAfter: string | null
  changeSummary: string
  detectedAt: string
}

export type AccountNewsRow = {
  id: string
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  body: string
  sourceLabel: string | null
  publishedOn: string
  segment: 'customer' | 'prospect'
}

export type MarketSignalsCompanyOption = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
}

export type MarketSignalsPageModel = {
  executives: ExecutiveTrackingRow[]
  news: AccountNewsRow[]
  companies: MarketSignalsCompanyOption[]
  followingCompanyIds: string[]
  signalReadKeys: string[]
  activeDealCompanyIds: string[]
  championWatchlist: string[]
}

function normalizeChampionKey(raw: string | null | undefined) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeDealStatus(raw: unknown) {
  const s = String(raw ?? '').trim()
  if (!s) return 'open'
  if (s === 'in_negotiation') return 'negotiation'
  if (s === 'rfp_phase') return 'rfp'
  if (s === 'on_hold' || s === 'reference_sought' || s === 'in_approval' || s === 'reference_found') return 'open'
  return s
}

function isActiveDealStatus(raw: unknown) {
  const normalized = normalizeDealStatus(raw)
  return normalized === 'open' || normalized === 'rfp' || normalized === 'negotiation'
}

export async function loadMarketSignalsPageData(): Promise<MarketSignalsPageModel> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      executives: [],
      news: [],
      companies: [],
      followingCompanyIds: [],
      signalReadKeys: [],
      activeDealCompanyIds: [],
      championWatchlist: [],
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id as string | undefined
  if (!orgId) {
    return {
      executives: [],
      news: [],
      companies: [],
      followingCompanyIds: [],
      signalReadKeys: [],
      activeDealCompanyIds: [],
      championWatchlist: [],
    }
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url, is_favorite')
    .eq('organization_id', orgId)
    .order('name')

  const companyList: MarketSignalsCompanyOption[] = (companies ?? []).map((company) => ({
    id: String(company.id),
    name: String(company.name ?? '—'),
    logoUrl: (company.logo_url as string | null) ?? null,
    isFollowing: Boolean(company.is_favorite),
  }))
  const followingCompanyIds = companyList.filter((company) => company.isFollowing).map((company) => company.id)
  const companyMetaById = new Map(companyList.map((company) => [company.id, company]))

  const { data: signalReadRows } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', user.id)
    .or('notification_key.like.market_exec:%,notification_key.like.market_news:%')
    .limit(500)
  const signalReadKeys = (signalReadRows ?? [])
    .map((row) => String(row.notification_key ?? ''))
    .filter(Boolean)

  const { data: championRows } = await supabase
    .from('market_signal_champion_watchlist')
    .select('person_key')
    .eq('user_id', user.id)
    .limit(500)
  const championWatchlist = Array.from(
    new Set(
      (championRows ?? [])
        .map((row) => normalizeChampionKey((row as { person_key?: string | null }).person_key ?? ''))
        .filter(Boolean)
    )
  )

  const { data: dealRows } = await supabase
    .from('deals')
    .select('company_id,status')
    .eq('organization_id', orgId)
    .not('company_id', 'is', null)
    .limit(2000)
  const activeDealCompanyIds = Array.from(
    new Set(
      (dealRows ?? [])
        .filter((row) => isActiveDealStatus((row as { status?: unknown }).status))
        .map((row) => String((row as { company_id?: string | null }).company_id ?? ''))
        .filter(Boolean)
    )
  )

  const { data: execRows, error: execErr } = await supabase
    .from('market_signal_executive_events')
    .select(
      `
      id,
      person_name,
      person_title_before,
      person_title_after,
      change_summary,
      detected_at,
      company_id,
      companies ( name, logo_url )
    `
    )
    .order('detected_at', { ascending: false })
    .limit(100)

  if (execErr) {
    console.error('[market-signals] executive_events', execErr.message)
  }

  const { data: newsRows, error: newsErr } = await supabase
    .from('market_signal_account_news')
    .select(
      `
      id,
      body,
      source_label,
      published_on,
      segment,
      company_id,
      companies ( name, logo_url )
    `
    )
    .order('published_on', { ascending: false })
    .limit(100)

  if (newsErr) {
    console.error('[market-signals] account_news', newsErr.message)
  }

  const executives: ExecutiveTrackingRow[] = (execRows ?? []).map((row: Record<string, unknown>) => {
    const co = Array.isArray(row.companies)
      ? (row.companies as { name?: string; logo_url?: string | null }[])[0]
      : (row.companies as { name?: string; logo_url?: string | null } | null)
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      companyName: co?.name?.trim() ? String(co.name) : '—',
      companyLogoUrl:
        (co?.logo_url as string | undefined) ?? companyMetaById.get(String(row.company_id))?.logoUrl ?? null,
      personName: String(row.person_name ?? ''),
      personTitleBefore: (row.person_title_before as string | null) ?? null,
      personTitleAfter: (row.person_title_after as string | null) ?? null,
      changeSummary: String(row.change_summary ?? ''),
      detectedAt: String(row.detected_at ?? ''),
    }
  })

  const news: AccountNewsRow[] = (newsRows ?? []).map((row: Record<string, unknown>) => {
    const co = Array.isArray(row.companies)
      ? (row.companies as { name?: string; logo_url?: string | null }[])[0]
      : (row.companies as { name?: string; logo_url?: string | null } | null)
    const seg = String(row.segment ?? 'customer')
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      companyName: co?.name?.trim() ? String(co.name) : '—',
      companyLogoUrl:
        (co?.logo_url as string | undefined) ?? companyMetaById.get(String(row.company_id))?.logoUrl ?? null,
      body: String(row.body ?? ''),
      sourceLabel: (row.source_label as string | null) ?? null,
      publishedOn: String(row.published_on ?? ''),
      segment: seg === 'prospect' ? 'prospect' : 'customer',
    }
  })

  return {
    executives,
    news,
    companies: companyList,
    followingCompanyIds,
    signalReadKeys,
    activeDealCompanyIds,
    championWatchlist,
  }
}
