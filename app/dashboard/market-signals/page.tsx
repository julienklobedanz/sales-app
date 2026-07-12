export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { MarketSignalsClient } from '@/app/dashboard/market-signals/market-signals-client'
import { loadMarketSignalsPageData } from '@/app/dashboard/market-signals/data'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function MarketSignalsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.organization_id) redirect(ROUTES.onboarding)

  const model = await loadMarketSignalsPageData()
  return <MarketSignalsClient model={model} />
}
