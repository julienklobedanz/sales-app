import { redirect } from 'next/navigation'

import { listComplianceDocuments } from '@/app/(app)/settings/compliance-actions'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'

import { ComplianceCollection } from './compliance-collection'

export const dynamic = 'force-dynamic'

export default async function CompliancePage() {
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const effective = await getRequestEffectiveRoles()
  if (!effective?.profile.organization_id) redirect(ROUTES.onboarding)

  const listed = await listComplianceDocuments()
  const documents = listed.success ? listed.rows : []

  return <ComplianceCollection documents={documents} />
}
