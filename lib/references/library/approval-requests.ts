'use server'

import { revalidatePath } from 'next/cache'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { asReferenceStatus } from '@/lib/supabase/db-types'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { log } from '@/lib/observability/logger'

export type RequestItem = {
  id: string
  reference_id: string
  reference_title: string
  company_name: string
  requester_name?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

function asRequestStatus(value: string): RequestItem['status'] {
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value
  return 'pending'
}

export async function getRequestsImpl(): Promise<RequestItem[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role')
    .eq('id', user.id)
    .single()

  const { systemRole } = parseProfileRoles(profile)

  let query = supabase
    .from('approvals')
    .select(
      `
      id,
      status,
      created_at,
      reference:references (
        id,
        title,
        companies ( name )
      ),
      requester:profiles ( full_name )
    `,
    )
    .order('created_at', { ascending: false })

  if (!isSystemAdmin(systemRole)) {
    query = query.eq('requester_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    log.error('getRequests.failed', {}, error)
    return []
  }

  return (data ?? []).map((row) => {
    const reference = Array.isArray(row.reference) ? row.reference[0] : row.reference
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester

    return {
      id: row.id,
      reference_id: reference?.id ?? '',
      reference_title: reference?.title ?? 'Unbekannt',
      company_name: accountFromJoin(reference?.companies)?.name ?? '—',
      requester_name: requester?.full_name ?? 'Unbekannt',
      status: asRequestStatus(row.status),
      created_at: row.created_at ?? '',
    }
  })
}

export async function reviewRequestImpl(
  approvalId: string,
  decision: 'approve_external' | 'approve_internal' | 'reject',
) {
  const supabase = await createServerSupabaseClient()

  const { data: approval, error: fetchErr } = await supabase
    .from('approvals')
    .select('reference_id')
    .eq('id', approvalId)
    .single()

  if (fetchErr || !approval) throw new Error('Antrag nicht gefunden')

  let newRefStatus = 'draft'
  let approvalStatus: 'approved' | 'rejected' = 'rejected'

  if (decision === 'approve_external') {
    newRefStatus = 'external'
    approvalStatus = 'approved'
  } else if (decision === 'approve_internal') {
    newRefStatus = 'internal'
    approvalStatus = 'approved'
  }

  const { error: refError } = await supabase
    .from('references')
    .update({ status: asReferenceStatus(newRefStatus) })
    .eq('id', approval.reference_id)

  if (refError) throw new Error(refError.message)

  const { error: appError } = await supabase
    .from('approvals')
    .update({ status: approvalStatus })
    .eq('id', approvalId)

  if (appError) throw new Error(appError.message)

  await logEventForCurrentOrg({
    eventType: 'internal_approval_decided',
    referenceId: approval.reference_id,
    payload: {
      decision,
      approval_id: approvalId,
    },
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.detail(approval.reference_id))
  revalidatePath(ROUTES.references.root)
  await revalidateOrgCachesForReference(approval.reference_id)
}
