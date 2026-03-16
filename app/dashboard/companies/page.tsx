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
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry, is_favorite, open_deals_count, contacts_count')
    .order('name')

  return (
    <div className="space-y-6 px-6 py-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strategisches Account-Management – Firmenübersicht, Opportunity Roadmap & Stakeholder-Mapping.
        </p>
      </div>

      <CompaniesGrid companies={companies ?? []} />
    </div>
  )
}
