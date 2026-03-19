import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from './actions'
import { DashboardOverview } from './dashboard-overview'
import type { Profile } from './dashboard-shell'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Props = {
  searchParams: Promise<{ favoriten?: string }>
}

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
  const { references, totalCount, deletedCount } = await getDashboardData(
    initialFavoritesOnly
  )

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .order('name')
  const { data: contacts } = await supabase
    .from('contact_persons')
    .select('*')
    .order('last_name')
  const { data: externalContacts } = await supabase
    .from('external_contacts')
    .select('id, company_id, first_name, last_name, email, role, phone')
    .eq('organization_id', profile.organization_id ?? '')
    .order('last_name')

  return (
    <DashboardOverview
      references={references}
      totalCount={totalCount}
      deletedCount={deletedCount}
      profile={profile as Profile}
      title="Success Stories"
      initialFavoritesOnly={initialFavoritesOnly}
      companies={companies ?? []}
      contacts={contacts ?? []}
      externalContacts={externalContacts ?? []}
    />
  )
}
