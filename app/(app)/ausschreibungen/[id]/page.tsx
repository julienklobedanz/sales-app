import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { canManageTenderDocuments } from '@/lib/deals/can-manage-deal-documents'
import { normalizeOrgDateDisplayFormat } from '@/lib/format'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { loadTenderPageData } from '@/lib/tenders/load-tender-page-data'

import { TenderPageContent } from '../tender-page-content'

export const dynamic = 'force-dynamic'

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <TenderDetailPageContent params={params} />
    </Suspense>
  )
}

async function TenderDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getRequestUser()
  if (!user) redirect(ROUTES.login)

  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  const supabase = await createServerSupabaseClient()
  const tender = await loadTenderPageData(supabase, {
    tenderId: id,
    organizationId: orgId,
  })
  if (!tender) notFound()

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('date_display_format')
    .eq('id', orgId)
    .maybeSingle()

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const canManageDocuments = canManageTenderDocuments(
    tender.lots,
    user.id,
    systemRole,
    functionRole,
  )

  return (
    <TenderPageContent
      tender={tender}
      orgDateDisplayFormat={normalizeOrgDateDisplayFormat(orgRow?.date_display_format)}
      canManageDocuments={canManageDocuments}
    />
  )
}
