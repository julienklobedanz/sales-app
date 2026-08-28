import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { DealDetailSkeleton } from '@/components/dashboard/deal-detail-skeleton'
import { ROUTES } from '@/lib/routes'
import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
import { loadSubmissionWorkspace } from '@/lib/deals/load-submission-workspace'
import {
  redirectToSelectedSubmission,
  submissionWorkspaceHref,
} from '@/lib/deals/submission-workspace-href'
import { parseProfileRoles } from '@/lib/roles/profile-roles'

import { getDealWithReferences } from '../../actions'
import { SubmissionWorkspaceView } from '../../cockpit/submission-workspace-view'

export const dynamic = 'force-dynamic'

export default function DealSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<DealDetailSkeleton />}>
      <DealSubmissionPageContent params={params} deadlineId={null} />
    </Suspense>
  )
}

export async function DealSubmissionPageContent({
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

  const deal = await getDealWithReferences(id)
  if (!deal) notFound()
  if (deal.tender_id) {
    redirect(submissionWorkspaceHref({ kind: 'tender', id: deal.tender_id }))
  }

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const canMutate = canManageDealDocuments(
    {
      sales_manager_id: deal.sales_manager_id,
      account_manager_id: deal.account_manager_id,
    },
    user.id,
    systemRole,
    functionRole,
  )
  const supabase = await createServerSupabaseClient()
  const owner = { kind: 'deal' as const, id }
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
