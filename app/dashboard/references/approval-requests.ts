'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
export type RequestItem = {
  id: string
  reference_id: string
  reference_title: string
  company_name: string
  requester_name?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function getRequestsImpl(): Promise<RequestItem[]> {
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
    `
    )
    .order('created_at', { ascending: false })

  if (profile?.role !== 'admin') {
    query = query.eq('requester_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getRequests] Error:', error)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const reference = row.reference as
      | { id?: string; title?: string; companies?: { name?: string } | { name?: string }[] }
      | null
    const companies = reference?.companies
    const companyName =
      Array.isArray(companies) && companies.length > 0
        ? (companies[0] as { name?: string }).name
        : (companies as { name?: string } | null)?.name

    const requester = row.requester as { full_name?: string } | null

    return {
      id: row.id as string,
      reference_id: reference?.id as string,
      reference_title: reference?.title ?? 'Unbekannt',
      company_name: companyName ?? '—',
      requester_name: requester?.full_name ?? 'Unbekannt',
      status: row.status as RequestItem['status'],
      created_at: row.created_at as string,
    }
  })
}

export async function reviewRequestImpl(
  approvalId: string,
  decision: 'approve_external' | 'approve_internal' | 'reject'
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
    .update({ status: newRefStatus })
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
  revalidatePath(ROUTES.evidence.detail(approval.reference_id))
  revalidatePath(ROUTES.evidence.root)
}

