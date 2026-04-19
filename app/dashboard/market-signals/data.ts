import 'server-only'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ExecutiveTrackingRow = {
  id: string
  companyId: string
  companyName: string
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
  body: string
  sourceLabel: string | null
  publishedOn: string
  segment: 'customer' | 'prospect'
}

export type MarketSignalsCompanyOption = { id: string; name: string }

export type MarketSignalsPageModel = {
  executives: ExecutiveTrackingRow[]
  news: AccountNewsRow[]
  companies: MarketSignalsCompanyOption[]
}

export async function loadMarketSignalsPageData(): Promise<MarketSignalsPageModel> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { executives: [], news: [], companies: [] }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id as string | undefined
  if (!orgId) {
    return { executives: [], news: [], companies: [] }
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  const companyList = (companies ?? []) as MarketSignalsCompanyOption[]

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
      companies ( name )
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
      companies ( name )
    `
    )
    .order('published_on', { ascending: false })
    .limit(100)

  if (newsErr) {
    console.error('[market-signals] account_news', newsErr.message)
  }

  const executives: ExecutiveTrackingRow[] = (execRows ?? []).map((row: Record<string, unknown>) => {
    const co = Array.isArray(row.companies)
      ? (row.companies as { name?: string }[])[0]
      : (row.companies as { name?: string } | null)
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      companyName: co?.name?.trim() ? String(co.name) : '—',
      personName: String(row.person_name ?? ''),
      personTitleBefore: (row.person_title_before as string | null) ?? null,
      personTitleAfter: (row.person_title_after as string | null) ?? null,
      changeSummary: String(row.change_summary ?? ''),
      detectedAt: String(row.detected_at ?? ''),
    }
  })

  const news: AccountNewsRow[] = (newsRows ?? []).map((row: Record<string, unknown>) => {
    const co = Array.isArray(row.companies)
      ? (row.companies as { name?: string }[])[0]
      : (row.companies as { name?: string } | null)
    const seg = String(row.segment ?? 'customer')
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      companyName: co?.name?.trim() ? String(co.name) : '—',
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
  }
}
