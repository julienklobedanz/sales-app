export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MarketSignalsManageClient } from './watchlist-manage-client'

type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  is_favorite: boolean | null
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

  const companies = ((data ?? []) as CompanyRow[]).map((row) => ({
    id: row.id,
    name: row.name ?? 'Unbekannt',
    logoUrl: row.logo_url ?? null,
    isFollowing: Boolean(row.is_favorite),
  }))

  return <MarketSignalsManageClient companies={companies} />
}
