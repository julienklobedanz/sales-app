'use server'

import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/capability-access'
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
