import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from './actions'
import { DashboardOverview } from './dashboard-overview'
import type { Profile } from './dashboard-shell'

type Props = { searchParams: Promise<{ favoriten?: string }> }

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const params = await searchParams
  const initialFavoritesOnly = params.favoriten === '1'
  const { references, totalCount } = await getDashboardData()

  return (
    <DashboardOverview
      references={references}
      totalCount={totalCount}
      profile={profile as Profile}
      title="Referenzen"
      initialFavoritesOnly={initialFavoritesOnly}
    />
  )
}
