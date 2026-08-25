import { redirect } from 'next/navigation'

import { listComplianceDocuments } from '@/app/(app)/settings/compliance-actions'
import { loadComplianceDocumentDealUsage } from '@/lib/compliance/load-compliance-document-deal-usage'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

import { ComplianceCollection } from './compliance-collection'

export const dynamic = 'force-dynamic'

export default async function CompliancePage() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  if (!effective?.profile.organization_id) redirect(ROUTES.onboarding)

  const orgId = effective.profile.organization_id
  const supabase = await createServerSupabaseClient()
  const [listed, usageByDocumentId] = await Promise.all([
    listComplianceDocuments(),
    loadComplianceDocumentDealUsage(supabase, orgId),
  ])
  const documents = listed.success ? listed.rows : []

  return (
    <ComplianceCollection documents={documents} usageByDocumentId={usageByDocumentId} />
  )
}
