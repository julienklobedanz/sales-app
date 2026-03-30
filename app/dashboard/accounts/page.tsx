import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompaniesGrid } from './companies-grid'

export default async function CompaniesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry')
    .eq('organization_id', profile.organization_id)
    .order('name')

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strategisches Account-Management – Firmenübersicht, Opportunity Roadmap & Stakeholder-Mapping.
        </p>
      </div>

      <CompaniesGrid companies={companies ?? []} />
    </div>
  )
}
