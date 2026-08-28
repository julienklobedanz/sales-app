import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { canManageTenderDocuments } from '@/lib/deals/can-manage-deal-documents'
import { loadSubmissionWorkspace } from '@/lib/deals/load-submission-workspace'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { loadTenderPageData } from '@/lib/tenders/load-tender-page-data'
import { redirectToSelectedSubmission } from '@/lib/deals/submission-workspace-href'

import { SubmissionWorkspaceView } from '@/app/(app)/deals/cockpit/submission-workspace-view'

export const dynamic = 'force-dynamic'

export default function TenderSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <TenderSubmissionPageContent params={params} deadlineId={null} />
    </Suspense>
  )
}

export async function TenderSubmissionPageContent({
  params,
  deadlineId,
}: {
  params: Promise<{ id: string }>
  deadlineId: string | null
}) {
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

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const canMutate = canManageTenderDocuments(
    tender.lots,
    user.id,
    systemRole,
    functionRole,
  )
  const owner = { kind: 'tender' as const, id }
  const data = await loadSubmissionWorkspace(supabase, {
    organizationId: orgId,
    owner,
    selectedDeadlineId: deadlineId,
    canMutate,
  })
  if (!data) notFound()

  const bounce = redirectToSelectedSubmission(
    owner,
    data.markedDeadlines.map((row) => row.id),
    deadlineId,
  )
  if (bounce) redirect(bounce)

  return <SubmissionWorkspaceView owner={owner} data={data} canMutate={canMutate} />
}
