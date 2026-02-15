import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from './actions'
import { DashboardOverview } from './dashboard-overview'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { references, totalCount } = await getDashboardData()

  return (
    <DashboardOverview references={references} totalCount={totalCount} />
  )
}
