export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveChampionPersonTitle } from '@/lib/market-signals/champion-display'
import { MarketSignalsManageClient } from './watchlist-manage-client'
import type { NewsroomSummary } from './newsrooms-card'

type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  is_favorite: boolean | null
  account_status: string | null
  website_url: string | null
  newsroom_urls: string[] | null
  newsroom_discovered_at: string | null
}

type ChampionWatchRow = {
  person_key: string
  person_name: string
  company_name: string | null
  person_title: string | null
  created_at: string
  is_active: boolean | null
}

export default async function MarketSignalsManagePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return (
      <MarketSignalsManageClient
        companies={[]}
        watchedStakeholders={[]}
        newsroomSummary={{ withWebsite: 0, discovered: 0, withUrls: 0, entries: [] }}
      />
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) {
    return (
      <MarketSignalsManageClient
        companies={[]}
        watchedStakeholders={[]}
        newsroomSummary={{ withWebsite: 0, discovered: 0, withUrls: 0, entries: [] }}
      />
    )
  }

  const { data } = await supabase
    .from('companies')
    .select(
      'id,name,logo_url,is_favorite,account_status,website_url,newsroom_urls,newsroom_discovered_at',
    )
    .eq('organization_id', orgId)
    .order('name')

  const { data: execRows } = await supabase
    .from('market_signal_executive_events')
    .select('company_id')
    .order('detected_at', { ascending: false })
    .limit(500)

  const { data: newsRows } = await supabase
    .from('market_signal_account_news')
    .select('company_id')
    .order('published_on', { ascending: false })
    .limit(500)

  const initialFollowingCount = ((data ?? []) as CompanyRow[]).filter((row) =>
    Boolean(row.is_favorite),
  ).length
  if (initialFollowingCount === 0) {
    const knownCompanyIds = new Set(((data ?? []) as CompanyRow[]).map((row) => row.id))
    const bootstrapCompanyIds = Array.from(
      new Set(
        [...(execRows ?? []), ...(newsRows ?? [])]
          .map((row) => String((row as { company_id?: string | null }).company_id ?? ''))
          .filter((companyId) => companyId && knownCompanyIds.has(companyId)),
      ),
    ).slice(0, 8)
    if (bootstrapCompanyIds.length > 0) {
      await supabase
        .from('companies')
        .update({ is_favorite: true })
        .eq('organization_id', orgId)
        .in('id', bootstrapCompanyIds)
      for (const row of (data ?? []) as CompanyRow[]) {
        if (bootstrapCompanyIds.includes(row.id)) row.is_favorite = true
      }
    }
  }

  const { data: championWatchRows } = await supabase
    .from('market_signal_champion_watchlist')
    .select('person_key, person_name, company_name, person_title, created_at, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500)

  const companies = ((data ?? []) as CompanyRow[]).map((row) => ({
    id: row.id,
    name: row.name ?? 'Unbekannt',
    logoUrl: row.logo_url ?? null,
    isFollowing: Boolean(row.is_favorite),
    accountStatus: row.account_status ?? null,
  }))

  const companyRows = (data ?? []) as CompanyRow[]
  const withWebsite = companyRows.filter((row) =>
    Boolean(String(row.website_url ?? '').trim()),
  ).length
  const discovered = companyRows.filter((row) =>
    Boolean(row.newsroom_discovered_at),
  ).length
  const withUrls = companyRows.filter(
    (row) => (row.newsroom_urls ?? []).filter(Boolean).length > 0,
  ).length
  const newsroomSummary: NewsroomSummary = {
    withWebsite,
    discovered,
    withUrls,
    entries: companyRows
      .filter((row) => Boolean(String(row.website_url ?? '').trim()))
      .map((row) => ({
        id: row.id,
        name: row.name ?? 'Unbekannt',
        urls: (row.newsroom_urls ?? []).filter(Boolean),
      }))
      .sort((a, b) => {
        if (a.urls.length > 0 !== b.urls.length > 0) {
          return a.urls.length > 0 ? -1 : 1
        }
        return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
      }),
  }

  const championRows = (championWatchRows ?? []) as ChampionWatchRow[]
  const watchedStakeholders = await Promise.all(
    championRows.map(async (row) => {
      let title = row.person_title?.trim() || null
      if (!title) {
        title = await resolveChampionPersonTitle(
          supabase,
          orgId,
          row.person_name,
          row.company_name,
        )
        if (title) {
          await supabase
            .from('market_signal_champion_watchlist')
            .update({ person_title: title })
            .eq('user_id', user.id)
            .eq('person_key', row.person_key)
        }
      }
      return {
        key: row.person_key,
        personName: row.person_name,
        companyName: row.company_name?.trim() || null,
        personTitle: title,
        createdAt: row.created_at,
        isFollowing: row.is_active !== false,
      }
    }),
  )

  return (
    <MarketSignalsManageClient
      companies={companies}
      watchedStakeholders={watchedStakeholders}
      newsroomSummary={newsroomSummary}
    />
  )
}
