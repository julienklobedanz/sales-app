'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'

export type PendingClientApprovalRow = {
  approvalId: string
  referenceId: string
  title: string
  companyName: string
  requestedAt: string
}

export async function getPendingClientApprovalsImpl(): Promise<PendingClientApprovalRow[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as AppRole | undefined) ?? 'sales'

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
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !data?.length) {
    if (error) console.error('[getPendingClientApprovals]', error.message)
    return []
  }

  const out: PendingClientApprovalRow[] = []

  for (const row of data as Record<string, unknown>[]) {
    const requesterId = row.requester_id as string | undefined
    if (role === 'sales' && requesterId !== user.id) continue

    const refRaw = row.reference as
      | {
          id?: string
          title?: string
          customer_approval_status?: string | null
          approval_token?: string | null
          companies?: { name?: string } | { name?: string }[] | null
        }
      | null
      | undefined

    if (!refRaw?.id) continue
    if (refRaw.customer_approval_status !== 'pending' || !refRaw.approval_token) continue

    const companies = refRaw.companies
    const companyName =
      Array.isArray(companies) && companies.length > 0
        ? (companies[0] as { name?: string }).name
        : (companies as { name?: string } | null)?.name

    out.push({
      approvalId: row.id as string,
      referenceId: refRaw.id,
      title: refRaw.title ?? '—',
      companyName: companyName ?? '—',
      requestedAt: row.created_at as string,
    })
  }

  return out
}
