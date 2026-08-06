'use server'

import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'
import { log } from '@/lib/observability/logger'

export type PendingClientApprovalRow = {
  approvalId: string
  referenceId: string
  title: string
  companyName: string
  requestedAt: string
}

export async function getPendingClientApprovalsImpl(): Promise<
  PendingClientApprovalRow[]
> {
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

  const { systemRole, functionRole } = parseProfileRoles(profile)
  const salesRestricted = profileIsSalesRestricted(systemRole, functionRole)

  const { data, error } = await supabase
    .from('approvals')
    .select(
      `
      id,
      created_at,
      requester_id,
      reference:references (
        id,
        title,
        customer_approval_status,
        approval_token,
        companies ( name )
      )
    `,
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !data?.length) {
    if (error) log.error('getPendingClientApprovals.failed', {}, error)
    return []
  }

  const out: PendingClientApprovalRow[] = []

  for (const row of data) {
    if (salesRestricted && row.requester_id !== user.id) continue

    const refRaw = Array.isArray(row.reference) ? row.reference[0] : row.reference
    if (!refRaw?.id) continue
    if (refRaw.customer_approval_status !== 'pending' || !refRaw.approval_token) continue

    out.push({
      approvalId: row.id,
      referenceId: refRaw.id,
      title: refRaw.title ?? '—',
      companyName: accountFromJoin(refRaw.companies)?.name ?? '—',
      requestedAt: row.created_at ?? '',
    })
  }

  return out
}
