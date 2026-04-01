import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect, notFound } from 'next/navigation'
import { CompanyDetailClient } from '../company-detail-client'
import {
  getCompanyStrategy,
  getStakeholders,
  getContactsByCompanyId,
  getReferencesByCompanyId,
  getActiveDealsByCompanyId,
} from '../actions'

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry, account_status')
    .eq('id', id)
    .single()

  if (!company) notFound()

  const [strategy, stakeholders, contacts, references, activeDeals] = await Promise.all([
    getCompanyStrategy(id),
    getStakeholders(id),
    getContactsByCompanyId(id),
    getReferencesByCompanyId(id),
    getActiveDealsByCompanyId(id),
  ])

  return (
    <div className="px-6 py-6 md:px-10 lg:px-16 xl:px-24">
      <div className="w-full max-w-6xl mx-auto">
        <CompanyDetailClient
          company={company}
          strategy={strategy}
          stakeholders={stakeholders}
          contacts={contacts}
          references={references}
          activeDeals={activeDeals}
        />
      </div>
    </div>
  )
}
