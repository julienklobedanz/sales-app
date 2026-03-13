import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CompanyDetailClient } from '../company-detail-client'
import {
  getCompanyStrategy,
  getStakeholders,
  getReferencesByCompanyId,
  getRoadmapProjects,
  getExpiringDealsByCompanyId,
  getRecommendedReferencesForAccount,
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
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url, website_url, headquarters, industry, account_status')
    .eq('id', id)
    .single()

  if (!company) notFound()

  const [strategy, stakeholders, references, roadmapProjects, expiringDeals, recommendedRefs] = await Promise.all([
    getCompanyStrategy(id),
    getStakeholders(id),
    getReferencesByCompanyId(id),
    getRoadmapProjects(id),
    getExpiringDealsByCompanyId(id),
    getRecommendedReferencesForAccount(id),
  ])

  return (
    <div className="px-6 py-6 md:px-10 lg:px-16 xl:px-24">
      <div className="w-full max-w-6xl mx-auto">
        <CompanyDetailClient
          company={company}
          strategy={strategy}
          stakeholders={stakeholders}
          references={references}
          roadmapProjects={roadmapProjects}
          expiringDeals={expiringDeals}
          recommendedRefs={recommendedRefs}
        />
      </div>
    </div>
  )
}
