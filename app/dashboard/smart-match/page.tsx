import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getDeals } from '@/app/dashboard/deals/actions'
import { SmartMatchShell } from './smart-match-shell'

export const dynamic = 'force-dynamic'

/**
 * Smart Match — Suche + Filter + Deal-Kontext.
 * Deals werden serverseitig geladen (Picker + „→ Deal"), optional per `?deal=`
 * vorausgewählt (Aufruf „aus einem Deal heraus").
 */
export default async function SmartMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const params = await searchParams
  const deals = await getDeals()
  const wanted = params.deal?.trim()
  const initialDealId = wanted && deals.some((d) => d.id === wanted) ? wanted : null

  return (
    <SmartMatchShell
      deals={deals}
      initialDealId={initialDealId}
      greetingName={profile?.full_name ?? user.user_metadata?.full_name ?? null}
    />
  )
}
