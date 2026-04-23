export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MarketSignalsManageClient } from './watchlist-manage-client'

type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  is_favorite: boolean | null
}

type ExecutiveRow = {
  person_name: string | null
  company_id: string | null
  companies: { name?: string | null } | Array<{ name?: string | null }> | null
}

type ChampionWatchRow = {
  person_key: string
}

function normalizeChampionKey(raw: string | null | undefined) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function MarketSignalsManagePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <MarketSignalsManageClient companies={[]} />

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return <MarketSignalsManageClient companies={[]} />

  const { data } = await supabase
    .from('companies')
    .select('id,name,logo_url,is_favorite')
    .eq('organization_id', orgId)
    .order('name')

  const { data: execRows } = await supabase
    .from('market_signal_executive_events')
    .select('person_name,company_id,companies(name)')
    .order('detected_at', { ascending: false })
    .limit(500)

  const { data: championWatchRows } = await supabase
    .from('market_signal_champion_watchlist')
    .select('person_key')
    .eq('user_id', user.id)
    .limit(500)

  const companies = ((data ?? []) as CompanyRow[]).map((row) => ({
    id: row.id,
    name: row.name ?? 'Unbekannt',
    logoUrl: row.logo_url ?? null,
    isFollowing: Boolean(row.is_favorite),
  }))

  const championWatchSet = new Set(
    ((championWatchRows ?? []) as ChampionWatchRow[])
      .map((row) => normalizeChampionKey(row.person_key))
      .filter(Boolean)
  )

  const championsByKey = new Map<string, { key: string; personName: string; companyName: string | null; detectedCount: number }>()
  for (const row of (execRows ?? []) as ExecutiveRow[]) {
    const personName = String(row.person_name ?? '').trim()
    if (!personName) continue
    const key = normalizeChampionKey(personName)
    if (!key) continue
    const companyRaw = Array.isArray(row.companies) ? row.companies[0] : row.companies
    const companyName = String(companyRaw?.name ?? '').trim() || null
    const existing = championsByKey.get(key)
    if (!existing) {
      championsByKey.set(key, { key, personName, companyName, detectedCount: 1 })
      continue
    }
    championsByKey.set(key, {
      ...existing,
      detectedCount: existing.detectedCount + 1,
      companyName: existing.companyName ?? companyName,
    })
  }
  const champions = Array.from(championsByKey.values())
    .map((item) => ({ ...item, isFollowing: championWatchSet.has(item.key) }))
    .sort((a, b) => {
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1
      if (a.detectedCount !== b.detectedCount) return b.detectedCount - a.detectedCount
      return a.personName.localeCompare(b.personName, 'de')
    })

  return <MarketSignalsManageClient companies={companies} champions={champions} />
}
