import 'server-only'

import { isMissingEnrichmentColumnsError } from '@/lib/market-signals/enrichment-db'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type MarketSignalCategory = 'people' | 'finance' | 'strategy'

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
  eventKind: 'role_change' | 'news_mention'
  sourceUrl: string | null
  signalCategory: MarketSignalCategory | null
  insightSignalFact: string | null
  insightWhyNow: string | null
}

export type AccountNewsRow = {
  id: string
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  body: string
  sourceLabel: string | null
  /** Original-Artikel-URL (z. B. aus Google News RSS). */
  sourceUrl: string | null
  publishedOn: string
  segment: 'customer' | 'prospect'
  signalCategory: MarketSignalCategory | null
  insightSignalFact: string | null
  insightWhyNow: string | null
}

export type MarketSignalsCompanyOption = {
  id: string
  name: string
  logoUrl: string | null
  isFollowing: boolean
}

export type MarketSignalsPageModel = {
  senderFullName: string | null
  executives: ExecutiveTrackingRow[]
  news: AccountNewsRow[]
  companies: MarketSignalsCompanyOption[]
  followingCompanyIds: string[]
  signalReadKeys: string[]
  activeDealCompanyIds: string[]
  championWatchlist: string[]
  referenceSnippetsByCompanyId: Record<
    string,
    Array<{
      id: string
      title: string
      industry: string | null
      status: string
      updatedAt: string
      companyId: string
      companyName: string
      companyLogoUrl: string | null
    }>
  >
  activeDeals: Array<{ id: string; title: string; companyId: string }>
}

function normalizeChampionKey(raw: string | null | undefined) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseSignalCategory(raw: unknown): MarketSignalCategory | null {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'people' || v === 'finance' || v === 'strategy') return v
  return null
}

const EXEC_EVENTS_SELECT_WITH_ENRICHMENT = `
  id,
  person_name,
  person_title_before,
  person_title_after,
  change_summary,
  detected_at,
  company_id,
  event_kind,
  source_url,
  signal_category,
  insight_signal_fact,
  insight_why_now,
  companies ( name, logo_url )
`

const EXEC_EVENTS_SELECT_BASE = `
  id,
  person_name,
  person_title_before,
  person_title_after,
  change_summary,
  detected_at,
  company_id,
  event_kind,
  source_url,
  companies ( name, logo_url )
`

const ACCOUNT_NEWS_SELECT_WITH_ENRICHMENT = `
  id,
  body,
  source_label,
  source_url,
  published_on,
  segment,
  company_id,
  signal_category,
  insight_signal_fact,
  insight_why_now,
  companies ( name, logo_url )
`

const ACCOUNT_NEWS_SELECT_BASE = `
  id,
  body,
  source_label,
  source_url,
  published_on,
  segment,
  company_id,
  companies ( name, logo_url )
`

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
      senderFullName: null,
      executives: [],
      news: [],
      companies: [],
      followingCompanyIds: [],
      signalReadKeys: [],
      activeDealCompanyIds: [],
      championWatchlist: [],
      referenceSnippetsByCompanyId: {},
      activeDeals: [],
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id as string | undefined
  if (!orgId) {
    return {
      senderFullName: (profile?.full_name as string | null) ?? null,
      executives: [],
      news: [],
      companies: [],
      followingCompanyIds: [],
      signalReadKeys: [],
      activeDealCompanyIds: [],
      championWatchlist: [],
      referenceSnippetsByCompanyId: {},
      activeDeals: [],
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
  let followingCompanyIds = companyList.filter((company) => company.isFollowing).map((company) => company.id)
  const companyMetaById = new Map(companyList.map((company) => [company.id, company]))

  const { data: signalReadRows } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', user.id)
    .or(
      'notification_key.like.market_exec:%,notification_key.like.market_news:%,notification_key.like.market_irrelevant:%'
    )
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

  const { data: activeDealRows } = await supabase
    .from('deals')
    .select('id,title,company_id,status')
    .eq('organization_id', orgId)
    .not('company_id', 'is', null)
    .limit(500)
  const activeDeals = (activeDealRows ?? [])
    .filter((row) => isActiveDealStatus((row as { status?: unknown }).status))
    .map((row) => ({
      id: String((row as { id?: string | null }).id ?? ''),
      title: String((row as { title?: string | null }).title ?? 'Deal'),
      companyId: String((row as { company_id?: string | null }).company_id ?? ''),
    }))
    .filter((d) => d.id && d.companyId)

  let execRows: Record<string, unknown>[] | null = null
  const execWithEnrichment = await supabase
    .from('market_signal_executive_events')
    .select(EXEC_EVENTS_SELECT_WITH_ENRICHMENT)
    .order('detected_at', { ascending: false })
    .limit(100)

  if (!execWithEnrichment.error) {
    execRows = (execWithEnrichment.data ?? []) as Record<string, unknown>[]
  } else if (isMissingEnrichmentColumnsError(execWithEnrichment.error.message)) {
    const execBase = await supabase
      .from('market_signal_executive_events')
      .select(EXEC_EVENTS_SELECT_BASE)
      .order('detected_at', { ascending: false })
      .limit(100)
    if (execBase.error) {
      console.error('[market-signals] executive_events', execBase.error.message)
    } else {
      execRows = (execBase.data ?? []) as Record<string, unknown>[]
    }
  } else {
    console.error('[market-signals] executive_events', execWithEnrichment.error.message)
  }

  let newsRows: Record<string, unknown>[] | null = null
  const newsWithEnrichment = await supabase
    .from('market_signal_account_news')
    .select(ACCOUNT_NEWS_SELECT_WITH_ENRICHMENT)
    .order('published_on', { ascending: false })
    .limit(100)

  if (!newsWithEnrichment.error) {
    newsRows = (newsWithEnrichment.data ?? []) as Record<string, unknown>[]
  } else if (isMissingEnrichmentColumnsError(newsWithEnrichment.error.message)) {
    const newsBase = await supabase
      .from('market_signal_account_news')
      .select(ACCOUNT_NEWS_SELECT_BASE)
      .order('published_on', { ascending: false })
      .limit(100)
    if (newsBase.error) {
      console.error('[market-signals] account_news', newsBase.error.message)
    } else {
      newsRows = (newsBase.data ?? []) as Record<string, unknown>[]
    }
  } else {
    console.error('[market-signals] account_news', newsWithEnrichment.error.message)
  }

  if (followingCompanyIds.length === 0) {
    const bootstrapCompanyIds = Array.from(
      new Set(
        [...(execRows ?? []), ...(newsRows ?? [])]
          .map((row) => String((row as { company_id?: string | null }).company_id ?? ''))
          .filter((companyId) => companyId && companyMetaById.has(companyId))
      )
    ).slice(0, 8)
    if (bootstrapCompanyIds.length > 0) {
      await supabase
        .from('companies')
        .update({ is_favorite: true })
        .eq('organization_id', orgId)
        .in('id', bootstrapCompanyIds)
      const bootstrapSet = new Set(bootstrapCompanyIds)
      for (const company of companyList) {
        if (bootstrapSet.has(company.id)) company.isFollowing = true
      }
      followingCompanyIds = bootstrapCompanyIds
    }
  }

  const executives: ExecutiveTrackingRow[] = (execRows ?? []).map((row: Record<string, unknown>) => {
    const co = Array.isArray(row.companies)
      ? (row.companies as { name?: string; logo_url?: string | null }[])[0]
      : (row.companies as { name?: string; logo_url?: string | null } | null)
    const ek = String(row.event_kind ?? 'role_change')
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
      eventKind: ek === 'news_mention' ? 'news_mention' : 'role_change',
      sourceUrl: (row.source_url as string | null) ?? null,
      signalCategory: parseSignalCategory(row.signal_category),
      insightSignalFact: (row.insight_signal_fact as string | null) ?? null,
      insightWhyNow: (row.insight_why_now as string | null) ?? null,
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
      sourceUrl: (row.source_url as string | null) ?? null,
      publishedOn: String(row.published_on ?? ''),
      segment: seg === 'prospect' ? 'prospect' : 'customer',
      signalCategory: parseSignalCategory(row.signal_category),
      insightSignalFact: (row.insight_signal_fact as string | null) ?? null,
      insightWhyNow: (row.insight_why_now as string | null) ?? null,
    }
  })

  const relevantCompanyIds = Array.from(
    new Set([...executives, ...news].map((x) => x.companyId).filter(Boolean))
  ).slice(0, 50)

  const referenceSnippetsByCompanyId: MarketSignalsPageModel['referenceSnippetsByCompanyId'] = {}
  if (relevantCompanyIds.length) {
    const { data: refRows, error: refErr } = await supabase
      .from('references')
      .select('id,title,industry,status,company_id,updated_at, companies ( name, logo_url )')
      .in('company_id', relevantCompanyIds)
      .order('updated_at', { ascending: false })
      .limit(250)

    if (refErr) {
      console.error('[market-signals] references', refErr.message)
    }

    for (const raw of refRows ?? []) {
      const row = raw as {
        id?: string | null
        title?: string | null
        industry?: string | null
        status?: string | null
        company_id?: string | null
        updated_at?: string | null
        companies?: { name?: string | null; logo_url?: string | null } | { name?: string | null; logo_url?: string | null }[] | null
      }
      const companyId = String(row.company_id ?? '')
      if (!companyId) continue
      const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
      const companyName = String(co?.name ?? '—').trim() || '—'
      const companyLogoUrl = (co?.logo_url as string | null) ?? null
      const arr = referenceSnippetsByCompanyId[companyId] ?? []
      if (arr.length >= 2) continue
      arr.push({
        id: String(row.id ?? ''),
        title: String(row.title ?? 'Referenz'),
        industry: (row.industry as string | null) ?? null,
        status: String(row.status ?? ''),
        updatedAt: String(row.updated_at ?? ''),
        companyId,
        companyName,
        companyLogoUrl,
      })
      referenceSnippetsByCompanyId[companyId] = arr
    }
  }

  return {
    senderFullName: (profile?.full_name as string | null) ?? null,
    executives,
    news,
    companies: companyList,
    followingCompanyIds,
    signalReadKeys,
    activeDealCompanyIds,
    championWatchlist,
    referenceSnippetsByCompanyId,
    activeDeals,
  }
}
